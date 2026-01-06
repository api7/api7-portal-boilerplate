'use client';


import { CopyBtn } from '@/components/api-hub/CopyBtn';

type MaskCopyTextItemProps = {
  value: string;
};
const MaskCopyTextItem = (props: MaskCopyTextItemProps) => {
  const { value } = props;
  return (
    <div className="flex items-center">
      <p>********</p>
      <CopyBtn content={value} />
    </div>
  );
};

export default MaskCopyTextItem;
