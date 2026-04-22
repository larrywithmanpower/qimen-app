import React, { useRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale/zh-TW';
import { ChevronLeft, ChevronRight } from 'lucide-react';

registerLocale('zh-TW', zhTW);

interface DateTimeSectionProps {
  selectedDate: Date;
  isQuestionMode: boolean;
  isAutoMode: boolean;
  onDateChange: (date: Date) => void;
}

const DateTimeSection: React.FC<DateTimeSectionProps> = ({
  selectedDate,
  isQuestionMode,
  isAutoMode,
  onDateChange,
}) => {
  const datePickerRef = useRef<DatePicker>(null);

  return (
    <div className="relative">
      <DatePicker
        ref={datePickerRef}
        selected={selectedDate}
        onChange={(date: Date | null) => {
          if (date && !isQuestionMode) {
            onDateChange(date);
          }
        }}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        dateFormat="yyyy/MM/dd aa h:mm"
        locale="zh-TW"
        className={`bg-transparent border-none focus:ring-0 outline-none font-mono text-xl text-theme-primary font-bold tracking-tight ${isQuestionMode ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        readOnly={isAutoMode || isQuestionMode}
        disabled={isAutoMode || isQuestionMode}
        popperPlacement="bottom"
        shouldCloseOnSelect={false}
        renderCustomHeader={({
          date,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="flex items-center justify-between px-4 h-[50px] bg-theme-bg box-border font-sans">
            <button
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              type="button"
              className="p-2 hover:bg-theme-card rounded-full text-theme-primary transition-colors disabled:opacity-50"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-theme-primary font-bold text-lg">
              {format(date, 'MMMM yyyy', { locale: zhTW })}
            </span>
            <button
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              type="button"
              className="p-2 hover:bg-theme-card rounded-full text-theme-primary transition-colors disabled:opacity-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      >
        <div className="border-t border-theme-border p-2 flex justify-end bg-theme-bg">
          <button
            onClick={() => {
              if (datePickerRef.current) {
                datePickerRef.current.setOpen(false);
              }
            }}
            className="bg-theme-primary text-theme-bg px-4 py-1 rounded font-bold hover:opacity-90 transition-colors text-sm"
          >
            確定
          </button>
        </div>
      </DatePicker>
    </div>
  );
};

export default DateTimeSection;
