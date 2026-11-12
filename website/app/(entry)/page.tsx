import { Home } from "@/components/Portfolio";
import SiteFrame from "@/components/SiteFrame";
import { site } from "@/content/site";
import { portfolioMetadata } from "@/lib/metadata";

export const metadata = portfolioMetadata("en", site.en.name + " | " + site.en.role, site.en.intro);

export default function Entry() {
  return <SiteFrame locale="en"><Home locale="en" /></SiteFrame>;
}
