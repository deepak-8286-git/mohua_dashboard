export default function PulseLine() {
  return (
    <div className="w-full py-1">
      <div
        className="animate-pulse-line"
        style={{
          borderTop: '2px dashed #F9A55A',
          width: '100%',
        }}
      />
    </div>
  )
}
