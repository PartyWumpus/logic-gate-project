import React, { useState, useRef, useEffect, Fragment, MouseEvent, RefObject } from 'react'
import { produce } from "immer"
import classNames from 'classnames';
import Draggable from 'react-draggable'
import Xarrow, { useXarrow, Xwrapper } from "react-xarrows"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import { Component, ComponentList, Input } from './Component'
import { SetStateType, coordinates } from './util'

interface identifier {
  type: "IN" | "OUT",
  index: number,
  id: string
}

/** input is a string like "IN/3/abcde-qwerty" and is converted to an identifier */
export function stringToIdentifier(string: string): identifier {
  const list = string.split("/")
  return {
    type:list[0] as "IN" | "OUT",
    index:Number(list[1]),
    id:list[2]
    }
}

export function identifierToString(type: "IN" | "OUT", index: number, id: string): string {
  return `${type}/${index}/${id}`
}

function DraggableComponent(
  {component, SetComponents, components, select, updateXarrow, selectedConnection, setSelectedConnection, scale, initialCoords, setSelectedComponent}: 
  {component: Component, 
   SetComponents: SetStateType<ComponentList>,
   components: ComponentList,
   select: (e: MouseEvent<HTMLButtonElement>) => void,
   updateXarrow: () => void,
   selectedConnection: string | null,
   setSelectedConnection: SetStateType<string | null>,
   scale: number,
   initialCoords: [number,number],
   setSelectedComponent: SetStateType<Component>,
  }) {
  const nodeRef = React.useRef<HTMLDivElement>(null);

  const defaultCoords = component.coords ?? {x:initialCoords[0]+350/scale,y:initialCoords[1]+250/scale} // TODO: change this to calculate the center of the screen coordinates better

  function interactHandler() {
    let res;
    const nextState = produce(components, draft => {
      res =draft[component.id].interact()
      Component.resolve_everything_from_draft(draft)
    })
    SetComponents(nextState)
    return res
  }

  function stopHandler(e, data) {
    const nextState = produce(components, draft => {
      draft[component.id].onStop(e, data)
    })
    SetComponents(nextState)
  }

  function deleteElement() {
    const id = component.id
    const nextState = produce(components, draft => {
      delete draft[id]
       if (selectedConnection && stringToIdentifier(selectedConnection).id == id) {setSelectedConnection(null)}
      // delete all connections to the component
      for (const i in draft) {
        const component = draft[i]
        for (const [index, connection] of component.inputs.entries()) {
          if (connection?.id == id) {component.inputs[index] = null}
        }
      }
      Component.resolve_everything_from_draft(draft)
    })
    SetComponents(nextState)
  }

  function contextMenuHandler(e) {
    e.preventDefault();
    if (!interactHandler()) {
      setSelectedComponent(component);
    }
  }
  
  return <Draggable onStart={(e) => e.preventDefault()} onStop={stopHandler} onDrag={updateXarrow} nodeRef={nodeRef} bounds="parent" defaultPosition={defaultCoords} scale={scale}>
        <div onContextMenu={contextMenuHandler} ref={nodeRef} className={classNames("component",component.name,component.values?.toString())}>
          {component instanceof Input && <button onClick={interactHandler}>swap</button>} {/* this has broken for some reason. fixme! */}
          {component.inputNames.map((name, i) => <button key={i} className={"IN"} id={identifierToString("IN",i,component.id)} onClick={select} >{name}</button>)}
          {component.outputNames.map((name, i) => <button key={i} className={"OUT"} id={identifierToString("OUT",i,component.id)} onClick={select} >{name}</button>)}
          
          <div className="component-context-menu" >
            <p>{component.values?.toString()}</p>
            <p>{component.name}</p>
            <button id={component.id} onClick={deleteElement}>delete me :)</button>
          </div>
        </div>
      </Draggable>
}



function MouseArrow({startID}: {startID: string}) {
  const [coordinates, setCoordinates] = useState<number[] | null>(null)
  const updateXarrow = useXarrow();

  function mousemove(e) {
    setCoordinates([e.x,e.y])
    updateXarrow()
  }

  useEffect(() => {
    window.addEventListener('mousemove', mousemove)
    return () => window.removeEventListener('mousemove', mousemove)
  }, []) 

  return coordinates &&
      <Xwrapper>
        <div id="mouse" style={{translate:`${coordinates[0]}px ${coordinates[1]}px`}}/>
        <Xarrow passProps={{pointerEvents: "none"}} showHead={false} key={"mouse-arrow"} start={startID} end={'mouse'}/>
      </Xwrapper>
}

export function ComponentView({components, SetComponents, setSelectedComponent}: {
  components: ComponentList, 
  SetComponents: SetStateType<ComponentList>, 
  setSelectedComponent: SetStateType<Component>}) {
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [coordinates, setCoordinates] = useState<[number,number]>([0,0]);
  const updateXarrow = useXarrow();

  function select(event: MouseEvent<HTMLButtonElement>) {
    if (!(event.target instanceof Element)) {return} // thanks https://stackoverflow.com/a/50326668
    const newIdentifier = event.target.id
    if (selectedConnection == null) {setSelectedConnection(newIdentifier);return}
    const identifier1 = stringToIdentifier(newIdentifier)
    const identifier2 = stringToIdentifier(selectedConnection)
    setSelectedConnection(null)
    if (identifier1.id == identifier2.id) {return}
    const nextState = produce(components, draft => {
      let input
      let output
      if (identifier1.type == "IN" && identifier2.type == "OUT") {
        input = identifier1
        output = identifier2
      } else if (identifier1.type == "OUT" && identifier2.type == "IN") {
        input = identifier2
        output = identifier1
      } else {return}
      draft[input.id].input(components[output.id], input.index, output.index)
      Component.resolve_everything_from_draft(draft)
    })
    SetComponents(nextState)
  }
  
  return (
  <div className="main-view">
    <TransformWrapper
      initialScale={1}
      centerOnInit={true}
      panning={{excluded:["component","button","p"],velocityDisabled:true}}
      doubleClick={{disabled:true}}
      onTransformed={(_, state ) => {
          setZoom(state.scale);
          setCoordinates([-state.positionX,-state.positionY])
          updateXarrow();
        }
      }
      minScale={0.125}
      maxScale={1.5}
    >
      {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
        <>
          <div className="tools">
            <button onClick={() => zoomIn()}>+</button>
            <button onClick={() => zoomOut()}>-</button>
            <button onClick={() => resetTransform()}>x</button>
          </div>
          <TransformComponent>
            <Xwrapper>
              {Object.values(components).map((component: Component) => 
                <DraggableComponent 
                  key={component.id} 
                  component={component} 
                  SetComponents={SetComponents} 
                  select={select}
                  updateXarrow={updateXarrow} 
                  components={components} 
                  selectedConnection={selectedConnection}
                  setSelectedConnection={setSelectedConnection}
                  scale={zoom}
                  initialCoords={coordinates}
                  setSelectedComponent={setSelectedComponent}
                />
              )}
            </Xwrapper>
          </TransformComponent>
          <div className="connections-list">
            {Object.values(components).map((component: Component) => 
              <Fragment key={component.id}>
                {component.inputs.map((connection, index) => connection && 
                  <Xarrow 
                    strokeWidth={zoom*4}
                    divContainerProps={{className:`connector ${components[connection.id].values[connection.index]?.toString()}`}}
                    showHead={false} key={index}
                    start={identifierToString("OUT",connection.index,connection.id)} end={identifierToString("IN",index,component.id)}
                  />
                )}
              </Fragment>
            )}

            </div>
            { selectedConnection && <MouseArrow startID={selectedConnection}/> }
        </>
      )}
    </TransformWrapper>
  </div>)
}