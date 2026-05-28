import { Checkbox } from 'antd';

import { cn } from '@/lib/utils';

export type TreeOptionValArr = {
  label: React.ReactNode;
  value: string;
  isCheck: boolean;
}[];
export type TreeOptionProps = Record<string, TreeOptionValArr>;

export type LabelDropDownProps = {
  onChange: React.Dispatch<React.SetStateAction<TreeOptionProps>>;
  value?: TreeOptionProps;
  hideKey?: boolean;
};

const LabelDropDown: React.FC<LabelDropDownProps> = ({
  hideKey = false,
  onChange,
  value,
}) => {
  const params = value || {};
  return (
    <>
      {Object.keys(params).length === 0 && (
        <div className="center p-1 text-base-content text-xs font-semibold">
          No Data
        </div>
      )}
      <div className="w-full max-h-[300px] overflow-y-auto">
        {Object.keys(params).map((item) => (
          <div className="py-2" key={item}>
            {!hideKey && (
              <div className="flex justify-center items-center h-6 px-2 text-xs text-base-content">
                <div className="w-full">{item}</div>
              </div>
            )}
            <div>
              {(params[item] || []).map((v) => {
                const isChecked = v.isCheck;

                return (
                  <div
                    className={cn(isChecked && 'bg-[#EFF1F5] font-medium')}
                    key={v.value}
                  >
                    <div className="center h-10 px-4">
                      <div className="w-full text-xs font-normal text-secondary-content">
                        <Checkbox
                          checked={isChecked}
                          onChange={(e) => {
                            const { checked } = e.target;
                            onChange((prev) => ({
                              ...prev,
                              [item]: prev[item].map((item) => {
                                if (item.value === v.value) {
                                  return {
                                    ...item,
                                    isCheck: checked,
                                  };
                                }
                                return item;
                              }),
                            }));
                          }}
                        >
                          {v.label}
                        </Checkbox>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
export default LabelDropDown;
