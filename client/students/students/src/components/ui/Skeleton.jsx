export default function Skeleton({ w = '100%', h = '1rem', style }) {
  return (
    <span
      className="skeleton"
      style={{ display:'inline-block', width:w, height:h, borderRadius:6, ...style }}
      aria-hidden="true"
    />
  );
}
