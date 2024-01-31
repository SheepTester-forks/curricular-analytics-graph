declare module '*.module.css' {
  const styles: Record<string, string>
  export default styles
}

declare module '*.csv' {
  const csv: string
  export default csv
}
