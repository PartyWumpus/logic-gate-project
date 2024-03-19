import React, { useState, useRef, useEffect, Fragment } from "react";
import Draggable, { DraggableEvent, DraggableData } from "react-draggable";
import Xarrow, { useXarrow, Xwrapper } from "react-xarrows";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import classNames from "classnames";
import { shallowEqual } from "react-redux";
import type { Opaque } from "type-fest";

import { useAppSelector, useAppDispatch } from "../state/hooks";
import { Component, Input, LogicGate, SevenSegDisplay, ComponentID } from "./Component";
import {
  remove,
  interact,
  changeCoords,
  connect,
  selectComponent,
  undo,
  redo,
} from "../state/components";
import { SetStateType } from "./util";

interface Identifier {
  type: "IN" | "OUT";
  index: number;
  id: ComponentID;
}

type IdentifierString = `${"IN" | "OUT"}/${number}/${ComponentID}`;

/** input is a string like "IN/3/abcde-qwerty" and is converted to an identifier */
function stringToIdentifier(string: IdentifierString): Identifier {
  const list = string.split("/");
  return {
    type: list[0] as "IN" | "OUT",
    index: Number(list[1]),
    id: list[2] as ComponentID,
  };
}

function identifierToString(type: "IN" | "OUT", index: number, id: ComponentID) {
  return `${type}/${index}/${id}` as IdentifierString;
}

function roundTo(input: number, round: number) {
  if (round == 0) {
    return input;
  }
  return Math.round(input / round) * round;
}

export function DraggableComponent({
  id,
  select,
  updateXarrow,
  scale,
  snap,
  initialCoords,
}: {
  id: ComponentID;
  select: (e: React.MouseEvent<HTMLButtonElement>) => void;
  updateXarrow: () => void;
  scale: number;
  snap: number;
  initialCoords: [number, number];
}) {
  const component = useAppSelector((state) => state.components.components.get(id)!);
  const dispatch = useAppDispatch();
  const nodeRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(
    component.coords ?? {
      x: roundTo(initialCoords[0], snap),
      y: roundTo(initialCoords[1], snap),
    },
  );

  const classes = classNames(["component", component.cssClasses, component.values[0]?.toString()]);

  function interactHandler() {
    // FIXME
    dispatch(interact(id));
  }

  function stopHandler(e: DraggableEvent, data: DraggableData) {
    setPosition({ x: roundTo(data.x, snap), y: roundTo(data.y, snap) });
    // save the position in the global state, so it can be retrived after deserialization
    dispatch(changeCoords([id, roundTo(data.x, snap), roundTo(data.y, snap)]));
  }

  function dragHandler(e: DraggableEvent, data: DraggableData) {
    setPosition({ x: data.x, y: data.y });
    updateXarrow();
  }

  function contextMenuHandler(e: React.MouseEvent) {
    e.preventDefault();
    dispatch(selectComponent(id));
  }

  return (
    <Draggable
      onStart={(e) => e.preventDefault()}
      onStop={stopHandler}
      onDrag={dragHandler}
      nodeRef={nodeRef}
      bounds="parent"
      scale={scale}
      position={position}
    >
      <div onContextMenu={contextMenuHandler} ref={nodeRef} className={classes}>
        <div className="input-buttons">
          {component.inputNames.map((name, i) => (
            <button
              key={i}
              className={"IN"}
              id={identifierToString("IN", i, component.id)}
              onClick={select}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="output-buttons">
          {component.outputNames.map((name, i) => (
            <button
              key={i}
              className={"OUT"}
              id={identifierToString("OUT", i, component.id)}
              onClick={select}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="component-context-menu">
          {/*<p>{component.values?.toString()}</p>*/}
          {component instanceof LogicGate || <p>{component.name}</p>}
          <button id={component.id} onClick={() => dispatch(remove(id))}>
            Delete
          </button>
        </div>
        {component instanceof Input && <button onClick={interactHandler}>toggle</button>}
      </div>
    </Draggable>
  );
}

function MouseArrow({ startID, zoom }: { startID: IdentifierString; zoom: number }) {
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const updateXarrow = useXarrow();

  function mousemove(e: globalThis.MouseEvent) {
    setCoordinates([e.x, e.y]);
    updateXarrow();
  }

  useEffect(() => {
    window.addEventListener("mousemove", mousemove);
    return () => window.removeEventListener("mousemove", mousemove);
  }, []);

  return (
    coordinates && (
      <Xwrapper>
        <div id="mouse" style={{ translate: `${coordinates[0]}px ${coordinates[1]}px` }} />
        <Xarrow
          key={"mouse-arrow"}
          passProps={{ pointerEvents: "none" }}
          showHead={false}
          strokeWidth={4 * zoom}
          start={startID}
          end={"mouse"}
        />
      </Xwrapper>
    )
  );
}

export function ComponentConnections({ zoom }: { zoom: number }) {
  const components = useAppSelector((state) => state.components.components);

  return (
    <div className="connections-list">
      {[...components.entries()].map(([id, component]) => (
        <Fragment key={id}>
          {component.inputs.map(
            (connection, index) =>
              connection && (
                <Xarrow
                  strokeWidth={4 * zoom}
                  divContainerProps={{
                    className: `connector ${components.get(connection.id)!.values[connection.index]?.toString()}`,
                  }}
                  showHead={false}
                  key={index}
                  start={identifierToString("OUT", connection.index, connection.id)}
                  end={identifierToString("IN", index, component.id)}
                />
              ),
          )}
        </Fragment>
      ))}
    </div>
  );
}

function ComponentViewSettings({
  zoomIn,
  zoomOut,
  setSnap,
}: {
  zoomIn: () => void;
  zoomOut: () => void;
  setSnap: SetStateType<number>;
}) {
  const dispatch = useAppDispatch();
  const disable_undos = useAppSelector((state) => state.components.componentsHistory.length === 0);
  const disable_redos = useAppSelector((state) => state.components.componentsFuture.length === 0);

  function sliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e?.target?.value!);
    if (value == 0) {
      setSnap(0);
    } else {
      setSnap(150 / (6 - value));
    }
  }

  function keydownHandler(e: KeyboardEvent) {
    if (e.code === "KeyZ") {
      dispatch(undo());
    } else if (e.code === "KeyR") {
      dispatch(redo());
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", keydownHandler);
    return () => {
      window.removeEventListener("keydown", keydownHandler);
    };
  }, []);

  return (
    <div className="static-ui-buttons">
      <button onClick={() => zoomIn()}>+</button>
      <button onClick={() => zoomOut()}>-</button>
      <input type="range" min="0" max="5" step="1" onChange={sliderChange}></input>
      <br />
      <button onClick={() => dispatch(undo())} disabled={disable_undos}>
        undo
      </button>
      <button onClick={() => dispatch(redo())} disabled={disable_redos}>
        redo
      </button>
    </div>
  );
}

export function ComponentView() {
  const dispatch = useAppDispatch();
  const updateXarrow = useXarrow();

  // list of component IDs, for iterating over
  const ids = useAppSelector((state) => state.components.componentKeys, shallowEqual);
  // the html id of the input/output of a component that is currently selected
  const [selectedConnection, setSelectedConnection] = useState<IdentifierString | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [snap, setSnap] = useState<number>(150);
  const [coordinates, setCoordinates] = useState<[number, number]>([0, 0]);
  // ref of the root div, for determining screen size
  const ref = useRef<HTMLDivElement | null>(null);

  const classes = ["main-view", snap == 0 && "no-grid"];

  function select(event: React.MouseEvent<HTMLButtonElement>) {
    if (!(event.target instanceof Element)) {
      return;
    } // thanks https://stackoverflow.com/a/50326668
    const newIdentifier = event.target.id as IdentifierString;
    if (selectedConnection == null) {
      setSelectedConnection(newIdentifier);
      return;
    }

    const identifier1 = stringToIdentifier(newIdentifier);
    const identifier2 = stringToIdentifier(selectedConnection);
    setSelectedConnection(null);
    if (identifier1.id == identifier2.id) {
      return;
    }

    let input;
    let output;
    if (identifier1.type == "IN" && identifier2.type == "OUT") {
      input = identifier1;
      output = identifier2;
    } else if (identifier1.type == "OUT" && identifier2.type == "IN") {
      input = identifier2;
      output = identifier1;
    } else {
      return;
    }

    dispatch(connect([input.id, output.id, input.index, output.index]));
  }

  return (
    <div
      className={classNames(classes)}
      ref={ref}
      style={{ "--snap": String(snap), "--scale": String(zoom) }}
    >
      <TransformWrapper
        initialScale={1}
        centerOnInit={true}
        panning={{
          excluded: [
            "component",
            "button",
            "p",
            "component-context-menu",
            //"svg",
            "input-buttons",
            "output-buttons",
          ],
          velocityDisabled: true,
        }}
        doubleClick={{ disabled: true }}
        onTransformed={(_, state) => {
          setZoom(state.scale);
          // position values are weird with scale, and only give the top left corner when the scale is 1, dividing by scale fixes this
          // we then add half the width/height to move the position to the center of the screen
          setCoordinates([
            (-state.positionX + ref?.current?.clientWidth! / 2 - 50) / state.scale,
            (-state.positionY + ref?.current?.clientHeight! / 2 - 50) / state.scale,
          ]);
        }}
        minScale={0.125}
        maxScale={10.5}
      >
        {({ zoomIn, zoomOut }) => (
          <>
            <ComponentViewSettings zoomIn={zoomIn} zoomOut={zoomOut} setSnap={setSnap} />
            <TransformComponent>
              <Xwrapper>
                {ids.map((id: ComponentID) => (
                  <DraggableComponent
                    key={id}
                    id={id}
                    select={select}
                    updateXarrow={updateXarrow}
                    scale={zoom}
                    snap={snap}
                    initialCoords={coordinates}
                  />
                ))}
              </Xwrapper>
            </TransformComponent>
            <ComponentConnections zoom={zoom} />
          </>
        )}
      </TransformWrapper>
      {selectedConnection && <MouseArrow startID={selectedConnection} zoom={zoom} />}
    </div>
  );
}
