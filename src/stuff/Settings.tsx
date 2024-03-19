import { useRef, MouseEvent } from "react";

import { setSetting, Settings } from "../state/settings";
import { useAppDispatch, useAppSelector } from "../state/hooks";

type BoolSetting = {
  [Key in keyof Settings]: Settings[Key] extends boolean ? Key : never;
}[keyof Settings];

function ToggleSetting({ setting, text }: { setting: BoolSetting; text: string }) {
  const dispatch = useAppDispatch();
  const value = useAppSelector((state) => state.settings[setting]);

  return (
    <>
      <input
        id={setting}
        onChange={() => dispatch(setSetting([setting, !value]))}
        type="checkbox"
        checked={value}
      />
      <label htmlFor={setting}>{text}</label>
      <br />
    </>
  );
}

type StringSetting = {
  [Key in keyof Settings]: Settings[Key] extends string ? Key : never;
}[keyof Settings];

function DropdownSetting<T extends StringSetting>({
  setting,
  options,
  text,
}: {
  setting: T;
  options: Settings[T][];
  text: string;
}) {
  const dispatch = useAppDispatch();
  const value = useAppSelector((state) => state.settings[setting]);

  return (
    <>
      <select
        id={setting}
        value={value}
        onChange={(e) => {
          // @ts-expect-error, this is definitely valid but the type checker doesn't believe me
          dispatch(setSetting([setting, e.target.value]));
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {" "}
            {option}
          </option>
        ))}
      </select>
      <label htmlFor={setting}>{text}</label>
      <br />
    </>
  );
}

export function SettingsButton() {
  const dialog = useRef<HTMLDialogElement>(null);

  // if users click outside the bounds of the dialog then it should close the dialog
  function clickHandler(e: MouseEvent) {
    const { left, right, top, bottom } = dialog?.current?.getBoundingClientRect()!;
    if (e.clientY < top || e.clientY > bottom || e.clientX < left || e.clientX > right) {
      dialog?.current?.close();
    }
  }

  return (
    <>
      <button onClick={() => dialog?.current?.showModal()}>Settings</button>
      <dialog
        ref={dialog}
        onClick={clickHandler}
      >
        <h1>Settings</h1>
        <hr />
        <ToggleSetting setting="graysCode" text="Gray's Code" />
        <ToggleSetting setting="debugMode" text="Debug Mode" />
        <ToggleSetting setting="invertColors" text="Invert Colours" />
        <DropdownSetting setting="theme" options={["dark", "light"]} text="Theme" />
        <hr />
        <button onClick={() => dialog?.current?.close()}>close me</button>
      </dialog>
    </>
  );
}
