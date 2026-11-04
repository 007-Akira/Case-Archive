import { Link } from "react-router-dom";

export function Brand() {
  return (
    <Link to="/" className="brand">
      <img src="/icons/casebook-192.png" alt="" width={32} height={32} />
      Casebook
    </Link>
  );
}
