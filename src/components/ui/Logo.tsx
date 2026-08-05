export function Logo({ size = 36, rounded = 'rounded-xl' }: { size?: number; rounded?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 ${rounded} shadow-sm`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 2.5L4.5 5.3v5.8c0 5.1 3.3 9.4 7.5 10.9 4.2-1.5 7.5-5.8 7.5-10.9V5.3L12 2.5z"
          fill="white"
          fillOpacity="0.18"
        />
        <path
          d="M12 2.5L4.5 5.3v5.8c0 5.1 3.3 9.4 7.5 10.9 4.2-1.5 7.5-5.8 7.5-10.9V5.3L12 2.5z"
          stroke="white"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M8.3 12.3l2.5 2.5 5-5.2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
