import './App.css'
import { useState } from 'react'

import { ComponentList, Component } from './stuff/Component'
import { ComponentView } from './stuff/ComponentView'
import { ComponentStore } from './stuff/ComponentStore'
import { ComponentMetadata } from './stuff/ComponentMetadata'

// TODO: formatting :(
// TODO: add karnaugh maps
// TODO: add more ways of displaying data, like a 7seg display



export default function App() {
  const [components, setComponents] = useState<ComponentList>({});
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  
  return (
    <main>
      <ComponentStore components={components} SetComponents={setComponents} />
      <ComponentView components={components} SetComponents={setComponents} setSelectedComponent={setSelectedComponent}/>
      {selectedComponent && <ComponentMetadata component={selectedComponent}/>}
      {console.log(selectedComponent)}
    </main>
  )
}