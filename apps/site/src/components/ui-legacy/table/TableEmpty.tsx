import { memo } from 'react';

const TableEmpty: React.FC<{ description?: string }> = (props) => {
  const { description = '' } = props;
  return (
    <div className="h-full">
      <div className="flex w-full h-full bg-no-repeat bg-cover items-center justify-center bg-[url('/nodata.svg')]">
        <p className="font-medium text-xl text-gray-600">{description}</p>
      </div>
    </div>
  );
};

export default memo(TableEmpty);
