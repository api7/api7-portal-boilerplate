import { type ReactNode, useEffect, useRef } from 'react';

const TopBar = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty(
        '--app-top-bar-height',
        `${element.offsetHeight}px`,
      );
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--app-top-bar-height');
    };
  }, []);

  return (
    <div ref={ref} className="sticky top-0 z-50">
      {children}
    </div>
  );
};

export default TopBar;
