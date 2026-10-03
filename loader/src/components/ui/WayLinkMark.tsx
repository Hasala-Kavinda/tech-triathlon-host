import wayTrackLogo from "../../assets/waytrack-logo.png";
import { Text } from "./Text";

export function WayLinkMark() {
  return (
    <div className="waylink-mark" aria-label="WayTrack">
      <img alt="" className="brand__mark" src={wayTrackLogo} />
      <Text as="span" variant="h3" className="waylink-mark__word">
        WayTrack
      </Text>
    </div>
  )
}
