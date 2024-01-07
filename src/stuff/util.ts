import {Dispatch, SetStateAction} from 'react'

export type SetStateType<T> = Dispatch<SetStateAction<T>>

export interface coordinates {
  x: number;
  y: number
}