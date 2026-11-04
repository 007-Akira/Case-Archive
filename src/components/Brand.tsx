import { Link } from "react-router-dom";

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Casebook home">
      <img src="/icons/casebook-192.png" alt="Casebook" width={40} height={40} />
    </Link>
  );
}
