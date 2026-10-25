import { Providers } from "./providers";
import { HomeClient } from "@/components/home/HomeClient";

export default function Page() {
  return (
    <Providers>
      <HomeClient />
    </Providers>
  );
}
