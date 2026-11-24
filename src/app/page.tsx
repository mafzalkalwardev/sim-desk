import Desk from "./desk";

export default function Page() {
  return <Desk operatorKey={process.env.OPERATOR_KEY ?? ""} lanBaseUrl={process.env.LAN_BASE_URL ?? ""} />;
}
