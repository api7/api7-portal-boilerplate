import { memo } from 'react';

const Empty: React.FC<{ description?: string }> = ({ description = '' }) => (
  <div className="h-full">
    <div className="flex w-full h-full items-center justify-center">
      <p className="font-medium text-xl text-gray-600">{description}</p>
    </div>
  </div>
);

export default memo(Empty);
