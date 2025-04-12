import type { WrappedResult } from "metabase/search/types";
import { Group } from "metabase/ui";

import { InfoTextAssetLink } from "./InfoTextAssetLink";
import { InfoTextEditedInfo } from "./InfoTextEditedInfo";

type InfoTextProps = {
  result: WrappedResult;
  isCompact?: boolean;
  showLinks?: boolean;
};

export const InfoText = ({
  result,
  isCompact,
  showLinks = true,
}: InfoTextProps) => (
  <Group wrap="nowrap" gap="xs" w="100%" miw={0} sx={{ flexShrink: 1 }}>
    <InfoTextAssetLink showLinks={showLinks} result={result} />
    <InfoTextEditedInfo result={result} isCompact={isCompact} />
  </Group>
);
