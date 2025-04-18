// eslint-disable-next-line no-restricted-imports
import styled from "@emotion/styled";

import { color } from "metabase/lib/colors";

interface FormInputRootProps {
  touched?: boolean;
  error?: string | boolean;
}

export const FormInputRoot = styled.input<FormInputRootProps>`
  width: 100%;

  &:not(:focus) {
    border-color: ${(props) => props.touched && props.error && color("error")};
  }
`;
