import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { parse12HourTime } from '../../lib/scheduleEngine';

interface WheelColumnProps<T extends string | number> {
  label: string;
  items: T[];
  selectedValue: T;
  onChange: (value: T) => void;
  formatDisplay?: (value: T) => string;
  widthClass?: string;
  itemHeight?: number;
}

function WheelColumn<T extends string | number>({
  label,
  items,
  selectedValue,
  onChange,
  formatDisplay = (v) => String(v),
  widthClass = 'w-16',
  itemHeight = 38,
}: WheelColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  const selectedIndex = useMemo(() => {
    const idx = items.indexOf(selectedValue);
    return idx >= 0 ? idx : 0;
  }, [items, selectedValue]);

  // Center the selected item on mount or when value changes programmatically
  useEffect(() => {
    if (!containerRef.current || isUserScrollingRef.current) return;
    const targetScrollTop = selectedIndex * itemHeight;
    if (Math.abs(containerRef.current.scrollTop - targetScrollTop) > 2) {
      containerRef.current.scrollTop = targetScrollTop;
    }
  }, [selectedIndex, itemHeight]);

  const handleScroll = useCallback(() => {
    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      isUserScrollingRef.current = false;
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const newIndex = Math.max(0, Math.min(items.length - 1, Math.round(scrollTop / itemHeight)));
      if (items[newIndex] !== undefined && items[newIndex] !== selectedValue) {
        onChange(items[newIndex]);
      }
      // Re-align scroll position exactly to snapped item
      containerRef.current.scrollTo({
        top: newIndex * itemHeight,
        behavior: 'smooth',
      });
    }, 120);
  }, [items, itemHeight, selectedValue, onChange]);

  const handleItemClick = (index: number) => {
    if (index >= 0 && index < items.length) {
      onChange(items[index]);
      containerRef.current?.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleStep = (direction: 'prev' | 'next') => {
    const nextIdx = direction === 'prev' ? selectedIndex - 1 : selectedIndex + 1;
    if (nextIdx >= 0 && nextIdx < items.length) {
      onChange(items[nextIdx]);
      containerRef.current?.scrollTo({
        top: nextIdx * itemHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleStep('prev');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleStep('next');
    }
  };

  // Fixed container parameters for 3 visible rows
  const visibleRows = 3;
  const containerHeight = itemHeight * visibleRows;
  const paddingSpacerHeight = (containerHeight - itemHeight) / 2;

  return (
    <div className={`flex flex-col items-center ${widthClass}`}>
      {/* Mini Up Stepper */}
      <button
        type="button"
        onClick={() => handleStep('prev')}
        disabled={selectedIndex === 0}
        aria-label={`Previous ${label}`}
        className="p-1 text-[#806A56] hover:text-[#38271C] disabled:opacity-20 cursor-pointer disabled:cursor-default transition-opacity"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>

      {/* Drum Wheel Container */}
      <div
        className="relative w-full rounded-xl bg-[#FFF9F1] border border-[#E6D8C7] overflow-hidden select-none shadow-2xs focus-within:ring-2 focus-within:ring-[#493222]/30"
        style={{ height: `${containerHeight}px` }}
      >
        {/* Optical Top Gradient Mask */}
        <div className="absolute top-0 left-0 right-0 h-9 bg-gradient-to-b from-[#FFF9F1] via-[#FFF9F1]/80 to-transparent pointer-events-none z-10" />

        {/* Optical Bottom Gradient Mask */}
        <div className="absolute bottom-0 left-0 right-0 h-9 bg-gradient-to-t from-[#FFF9F1] via-[#FFF9F1]/80 to-transparent pointer-events-none z-10" />

        {/* Center Selection Lens Band */}
        <div
          className="absolute left-1 right-1 rounded-lg bg-[#493222]/10 border border-[#493222]/20 pointer-events-none z-0"
          style={{
            top: `${paddingSpacerHeight}px`,
            height: `${itemHeight}px`,
          }}
        />

        {/* Scrollable Drum List */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="listbox"
          aria-label={label}
          style={{
            height: `${containerHeight}px`,
            overscrollBehavior: 'contain',
          }}
          className="overflow-y-auto scrollbar-none snap-y snap-mandatory outline-none relative z-5"
        >
          {/* Top spacer */}
          <div style={{ height: `${paddingSpacerHeight}px` }} aria-hidden="true" />

          {items.map((item, index) => {
            const isSelected = index === selectedIndex;
            const distance = Math.abs(index - selectedIndex);

            return (
              <div
                key={String(item)}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleItemClick(index)}
                style={{ height: `${itemHeight}px` }}
                className={`snap-center flex items-center justify-center cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'text-[#38271C] font-extrabold text-sm sm:text-base scale-105'
                    : distance === 1
                    ? 'text-[#806A56] text-xs font-medium opacity-65'
                    : 'text-[#806A56]/40 text-[10px] font-normal opacity-30'
                }`}
              >
                {formatDisplay(item)}
              </div>
            );
          })}

          {/* Bottom spacer */}
          <div style={{ height: `${paddingSpacerHeight}px` }} aria-hidden="true" />
        </div>
      </div>

      {/* Mini Down Stepper */}
      <button
        type="button"
        onClick={() => handleStep('next')}
        disabled={selectedIndex === items.length - 1}
        aria-label={`Next ${label}`}
        className="p-1 text-[#806A56] hover:text-[#38271C] disabled:opacity-20 cursor-pointer disabled:cursor-default transition-opacity"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface WheelTimePickerProps {
  value: string; // e.g. "09:00 AM" or "10:25 AM"
  onChange: (formattedTime: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export const WheelTimePicker: React.FC<WheelTimePickerProps> = ({
  value,
  onChange,
  label,
  error,
  disabled = false,
}) => {
  const parsed = useMemo(() => parse12HourTime(value), [value]);

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  const periods = useMemo<('AM' | 'PM')[]>(() => ['AM', 'PM'], []);

  const updateTime = useCallback(
    (newHour: number, newMinute: number, newPeriod: 'AM' | 'PM') => {
      const hStr = newHour.toString().padStart(2, '0');
      const mStr = newMinute.toString().padStart(2, '0');
      onChange(`${hStr}:${mStr} ${newPeriod}`);
    },
    [onChange]
  );

  const handleHourChange = useCallback(
    (h: number) => {
      updateTime(h, parsed.minute, parsed.period);
    },
    [parsed.minute, parsed.period, updateTime]
  );

  const handleMinuteChange = useCallback(
    (m: number) => {
      updateTime(parsed.hour, m, parsed.period);
    },
    [parsed.hour, parsed.period, updateTime]
  );

  const handlePeriodChange = useCallback(
    (p: 'AM' | 'PM') => {
      updateTime(parsed.hour, parsed.minute, p);
    },
    [parsed.hour, parsed.minute, updateTime]
  );

  return (
    <div className={`space-y-1.5 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#493222] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#806A56]" />
            <span>{label}</span>
          </label>
          <span className="font-mono text-xs font-bold text-[#38271C] bg-[#EFE3D3] px-2 py-0.5 rounded-lg border border-[#E6D8C7]">
            {value || '09:00 AM'}
          </span>
        </div>
      )}

      {/* Wheel Drums Row */}
      <div className="flex items-center justify-center gap-2 p-3 bg-white border border-[#E6D8C7] rounded-2xl shadow-2xs">
        {/* Hour Drum */}
        <WheelColumn
          label="Hour"
          items={hours}
          selectedValue={parsed.hour}
          onChange={handleHourChange}
          formatDisplay={(h) => h.toString().padStart(2, '0')}
          widthClass="w-16"
        />

        {/* Colon Divider */}
        <div className="text-lg font-bold text-[#493222] -mt-0.5 select-none animate-pulse">:</div>

        {/* Minute Drum */}
        <WheelColumn
          label="Minute"
          items={minutes}
          selectedValue={parsed.minute}
          onChange={handleMinuteChange}
          formatDisplay={(m) => m.toString().padStart(2, '0')}
          widthClass="w-16"
        />

        {/* AM / PM Drum */}
        <WheelColumn
          label="Period"
          items={periods}
          selectedValue={parsed.period}
          onChange={handlePeriodChange}
          widthClass="w-16"
        />
      </div>

      {error && <p className="text-[11px] text-[#C84B31] font-semibold mt-1">{error}</p>}
    </div>
  );
};
