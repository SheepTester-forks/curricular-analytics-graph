import React from 'react'
import styles from './Dropdown.module.css'

function keyIn<T extends {}> (
  object: T,
  key: string | number | symbol
): key is keyof T {
  return key in object
}

export type DropdownProps<Options> = {
  options: Options
  value: keyof Options
  onChange: (value: keyof Options) => void
  children?: React.ReactNode
}
export function Dropdown<Options extends {}> ({
  options,
  value,
  onChange,
  children
}: DropdownProps<Options>) {
  const optionElems: React.ReactNode[] = []
  for (const key in options) {
    optionElems.push(
      <option value={key} key={key}>
        {String(options[key])}
      </option>
    )
  }

  return (
    <label className={styles.wrapper}>
      <span className={styles.label}>{children}</span>
      <select
        value={String(value)}
        onChange={e => {
          if (keyIn(options, e.currentTarget.value)) {
            onChange(e.currentTarget.value)
          }
        }}
      >
        {optionElems}
      </select>
    </label>
  )
}

export type TextFieldProps = {
  numeric?: boolean
  value: string
  onChange: (value: string) => void
  children?: React.ReactNode
}
export function TextField ({
  numeric,
  value,
  onChange,
  children
}: TextFieldProps) {
  return (
    <label className={styles.wrapper}>
      <span className={styles.label}>{children}</span>
      <input
        value={value}
        onChange={e => onChange(e.currentTarget.value)}
        {...(numeric ? { type: 'number' } : {})}
      />
    </label>
  )
}
