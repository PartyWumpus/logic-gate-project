import './App.css'
import { useState } from 'react'

import { ComponentList } from './stuff/Component'
import { ComponentView } from './stuff/ComponentView'
import { ComponentStore } from './stuff/ComponentStore'

// TODO: formatting :(
// TODO: add karnaugh maps + maybe boolean expression
// TODO: add more ways of displaying data, like a 7seg display



export default function App() {
  const [components, SetComponents] = useState<ComponentList>({});
  
  return (
    <main>
      <ComponentStore components={components} SetComponents={SetComponents} />
      <ComponentView components={components} SetComponents={SetComponents} />
    </main>
  )
}









