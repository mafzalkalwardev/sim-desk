import Desk from "./desk";

export const dynamic = "force-dynamic";

export default function Page() {
  return <Desk lanBaseUrl={process.env.LAN_BASE_URL ?? ""} publicUrl={process.env.PUBLIC_URL ?? ""} />;
}
