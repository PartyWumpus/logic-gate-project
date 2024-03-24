import "./App.css";

import { ComponentView } from "./stuff/ComponentView";
import { ComponentStore } from "./stuff/ComponentStore";
import { ComponentMetadata } from "./stuff/ComponentMetadata";

import { useAppSelector } from "./state/hooks";

// TODO: formatting :(
// TODO: add karnaugh maps
// TODO: add more ways of displaying data, like a 7seg display
// TODO: calculate truth table and boolean expression of incoming stuff for output gates, as if they were nested components
// TODO: check for if there are any cycles before allowing user to make a new connection
// TODO: center input/output properly. i have no idea why it doesn't work

// the only way to preload images without rendering them is to load them into an image
// and add them to the global window object

async function imagePreloader() {
  const gateTypes = ["AND", "OR", "XOR", "NAND", "NOR", "XNOR", "NOT"];
  const paths = ["/gates/disconnected/", "/gates/on/", "/gates/off/"];

  const files = paths.flatMap((path) => gateTypes.map((type) => path + type + ".svg"));

  // @ts-ignore
  window.preloadedFiles = [];
  for (let i = 0; i < files.length; i++) {
    const newImage = new Image();
    newImage.src = files[i];

    // @ts-ignore
    window.preloadedFiles.push(newImage);
  }
}

imagePreloader();

export default function App() {
  const theme = useAppSelector((state) => state.settings.theme);
  const invertColors = useAppSelector((state) => state.settings.invertColors);

  return (
    <main className={`theme-${theme}`} style={{ filter: `invert(${Number(invertColors)})` }}>
      <ComponentStore />
      <ComponentView />
      <ComponentMetadata />
    </main>
  );
}
