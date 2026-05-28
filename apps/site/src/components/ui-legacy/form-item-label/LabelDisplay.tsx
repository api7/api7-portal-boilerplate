import { Wrap, WrapItem } from '@chakra-ui/react';

import A7Label from '@/components/api7/api7-label';

type LabelDisplayProps = {
  labels?: Record<string, string>;
};

const LabelDisplay: React.FC<LabelDisplayProps> = ({ labels = {} }) => (
  <Wrap>
    {Object.keys(labels).map((key) => (
      <WrapItem key={key}>
        <A7Label color="blue">{`${key}:${labels[key]}`}</A7Label>
      </WrapItem>
    ))}
  </Wrap>
);

export default LabelDisplay;
