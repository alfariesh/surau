// DIHASILKAN oleh scripts/ikon.mjs dari apps/web/src/icons/svg. Jangan sunting tangan.
// Sumber: Hugeicons Pro stroke-standard (berlisensi; lihat CLAUDE.md).
import type { ReactNode, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

function Ikon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function AiChat02(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M14 2.5H10C5.58172 2.5 2 6.28071 2 10.9444V12C2 14.415 2.96038 16.5932 4.5 18.1323C4.5 18.903 4.3 20.6556 3.5 21.5C6 21.5 7.50483 20.0256 7.50483 20.0256C8.28999 20.2974 9.12873 20.4444 10 20.4444H14C18.4183 20.4444 22 16.6637 22 12V10.9444C22 6.28071 18.4183 2.5 14 2.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M16.75 8.5C16.75 8.08579 16.4142 7.75 16 7.75C15.5858 7.75 15.25 8.08579 15.25 8.5H16.75ZM15.25 14.5C15.25 14.9142 15.5858 15.25 16 15.25C16.4142 15.25 16.75 14.9142 16.75 14.5H15.25ZM10.2222 8.5V7.75C9.90847 7.75 9.62788 7.9453 9.51891 8.23951L10.2222 8.5ZM10.7778 8.5L11.4811 8.23951C11.3721 7.9453 11.0915 7.75 10.7778 7.75V8.5ZM7.29669 14.2395C7.15283 14.6279 7.35109 15.0594 7.73951 15.2033C8.12794 15.3472 8.55945 15.1489 8.70331 14.7605L7.29669 14.2395ZM12.2967 14.7605C12.4406 15.1489 12.8721 15.3472 13.2605 15.2033C13.6489 15.0594 13.8472 14.6279 13.7033 14.2395L12.2967 14.7605ZM15.25 8.5V14.5H16.75V8.5H15.25ZM10.2222 9.25H10.7778V7.75H10.2222V9.25ZM8.70331 14.7605L9.5922 12.3605L8.18558 11.8395L7.29669 14.2395L8.70331 14.7605ZM9.5922 12.3605L10.9255 8.76049L9.51891 8.23951L8.18558 11.8395L9.5922 12.3605ZM10.0745 8.76049L11.4078 12.3605L12.8144 11.8395L11.4811 8.23951L10.0745 8.76049ZM11.4078 12.3605L12.2967 14.7605L13.7033 14.2395L12.8144 11.8395L11.4078 12.3605ZM8.88889 12.85H12.1111V11.35H8.88889V12.85Z"
        fill="currentColor"
      />
    </Ikon>
  );
}

export function AlertCircle(props: IconProps) {
  return (
    <Ikon {...props}>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M12 8V12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M12.125 15.75H12M12.25 15.75C12.25 15.8881 12.1381 16 12 16C11.8619 16 11.75 15.8881 11.75 15.75C11.75 15.6119 11.8619 15.5 12 15.5C12.1381 15.5 12.25 15.6119 12.25 15.75Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function AlphabetArabic(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M9 4L9 11"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M13 14H22C22 12 18.5 9.5 16.5 9.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M13 4V19C13 19.5523 12.5523 20 12 20H10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M5 4V19C5 19.5523 4.55228 20 4 20H2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function ArrowDown01(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M5.99977 9.00005L11.9998 15L17.9998 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function ArrowRight01(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M9.00005 6L15 12L9 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function ArrowRightDouble(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M12.5 6L18.5 12L12.5 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M5.5 6L11.5 12L5.50005 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Book02(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M15.5 7H8.5M12.499 11H8.49902"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M20 22H6C4.89543 22 4 21.1046 4 20M4 20C4 18.8954 4.89543 18 6 18H20V2H6C4.89543 2 4 2.89543 4 4V20Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M19.5 18C19.5 18 18.5 18.7628 18.5 20C18.5 21.2372 19.5 22 19.5 22"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function BookA(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M20 22H6C4.89543 22 4 21.1046 4 20M4 20C4 18.8954 4.89543 18 6 18H20V2H6C4.89543 2 4 2.89543 4 4V20Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M8 14L11.2996 6.45808C11.4213 6.17981 11.6963 6 12 6C12.3037 6 12.5787 6.17981 12.7004 6.45808L16 14M9.5 11H14.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M19.5 18C19.5 18 18.5 18.7628 18.5 20C18.5 21.2372 19.5 22 19.5 22"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function BookOpen01(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M7.99988 3.5H3.0005C2.44821 3.5 2 3.94858 2 4.50087V16.9991C2 17.5514 2.44765 18 2.99993 18H8.95053C10.433 18 11.7093 19.0464 12 20.5V5.5C11.0557 4.24097 10 3.5 7.99988 3.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M16 3.5H21C21.5523 3.5 22 3.94858 22 4.50087V16.9991C22 17.5514 21.5523 18 21 18H15.0495C13.5671 18 12.2907 19.0464 12 20.5V5.5C12.9443 4.24097 14 3.5 16 3.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Cancel01(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M18 6L6.00081 17.9992M17.9992 18L6 6.00085"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function ChatGpt(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M9 10.5L15 7L20.3294 10.028C21.4686 10.6746 22.0155 12.0542 21.9999 13.5C21.9757 15.7359 20.5 18 18 18"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M12 8.5L18 12V18C18 20.1274 15.4307 21.9867 13 22C11.626 22.0075 10.2963 21.3571 9.5 20"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M15 10.5V17.0293L9.55365 20.1172C6.64181 21.7711 1.43087 17.7556 3.45582 14.0158"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M14.9995 13.5L8.99948 17L3.67395 13.9719C2.47315 13.2896 2 12 2 10.5C1.99959 8 4 5.5 6.5 5.5"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M12 15.5L6 12V5.99996C6 3.88311 8.5 2 11 2C12.5 2 13.6967 2.63093 14.5 4"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M9 13.5V6.99682L14.4293 3.88279C16.8086 2.53352 21 4.95583 21 7.95305C21 8.95219 20.8263 9.36756 20.4098 10.0768"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function ChevronLeft(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M15 6L9 12L15 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M9 6L15 12L9 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Claude(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M13 12L18.5 5M7.63965 3L12.5 12L13.6865 3M4.48381 6.71679L11.9872 12M3 12L11.9872 12.473M12.2244 13.177L7 20M4.84194 16.8682L11.2824 12.9758M11.5 21L12.665 13.177M21 14L13.1846 12.668M21 10.5788L13 12.3223M16.779 19.646L12.8876 13.3772M19.3566 18.207L13.313 12.9893"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Computer(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M14 21H16M14 21C13.1716 21 12.5 20.3284 12.5 19.5V17L12 17M14 21H10M10 21H8M10 21C10.8284 21 11.5 20.3284 11.5 19.5V17L12 17M12 17V21"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M20 3H4C2.89543 3 2 3.89543 2 5V15C2 16.1046 2.89543 17 4 17H20C21.1046 17 22 16.1046 22 15V5C22 3.89543 21.1046 3 20 3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Copilot(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M13.8461 4C14.6683 4 15.3801 4.62364 15.5584 5.50016L15.7715 6.54763C16.0037 7.68837 16.93 8.5 18 8.5H11.3827M11.3827 8.5L10.3116 13.2894C9.98567 14.5945 8.90024 15.5 7.66156 15.5H4.83224C3.62479 15.5 2.74786 14.246 3.06556 12.9738L4.44552 6.94753C4.88008 5.20729 6.32731 4 7.97888 4H13.8461C13.0551 4 12.362 4.57821 12.1539 5.41168L11.3827 8.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M10.1539 20C9.33175 20 8.61992 19.3764 8.44158 18.4998L8.22845 17.4524C7.99635 16.3116 7.06995 15.5 6 15.5L12.6173 15.5M12.6173 15.5L13.6884 10.7106C14.0143 9.40546 15.0998 8.5 16.3384 8.5L19.1678 8.5C20.3752 8.5 21.2521 9.75395 20.9344 11.0262L19.5545 17.0525C19.1199 18.7927 17.6727 20 16.0211 20H10.1539C10.9449 20 11.638 19.4218 11.8461 18.5883L12.6173 15.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Copy01(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M16.5 7.5V4.5C16.5 3.39543 15.6046 2.5 14.5 2.5H4.5C3.39543 2.5 2.5 3.39543 2.5 4.5V14.5C2.5 15.6046 3.39543 16.5 4.5 16.5H7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M19.5 7.5H9.5C8.39543 7.5 7.5 8.39543 7.5 9.5V19.5C7.5 20.6046 8.39543 21.5 9.5 21.5H19.5C20.6046 21.5 21.5 20.6046 21.5 19.5V9.5C21.5 8.39543 20.6046 7.5 19.5 7.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Copyright(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M15 10C15 8.89543 14.1046 8 13 8H11C9.89543 8 9 8.89543 9 10V14C9 15.1046 9.89543 16 11 16H13C14.1046 16 15 15.1046 15 14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function FileEmpty02(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M20 20V9L13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M13 2V7C13 8.10457 13.8954 9 15 9H20"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Github(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M2 17.0234C3.63025 20.416 6.29407 21.6289 9.5 20.7444"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M9.99741 22.0234V18.5955C10.0002 17.5234 10.5002 16.5234 10.5002 16.5234C6.91613 15.3634 5 13.0234 5 10.0234C5 8.02344 5.5 7.02344 6.2871 6.05653C5.50019 4.02344 6.50019 2.02344 6.50019 2.02344C8.00019 2.02344 9.35877 2.55722 10.5 3.52344C12.0892 2.72882 14.9108 2.72882 16.5 3.52344C17.6412 2.55722 19 2.02344 20.5 2.02344C20.5 2.02344 21.5 4.02344 20.7131 6.05653C21.5002 7.02344 22.0002 8.02344 22.0002 10.0234C22.0002 13.0234 20.0841 15.3634 16.5 16.5234C16.5 16.5234 17 17.5234 17.0028 18.5955V22.0234"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function GoBackward15Sec(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M12 5L10 2.20004C10.6462 2.06886 11.3151 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 8.72836 3.57111 5.82368 6 3.99927"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M9.50005 16V10L8 11M15.5 10H12.5L12 12.5C12 12.5 13 12 14 12C15.0699 11.983 16 12.8729 16 14C16 15.0897 15 16 14.027 16C13 16 12.5 15.5 12 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function GoForward15Sec(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M12 5L14 2.20004C13.3538 2.06886 12.6849 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 8.72836 20.4289 5.82368 18 3.99927"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M9.50005 16V10L8 11M15.5 10H12.5L12 12.5C12 12.5 13 12 14 12C15.0699 11.983 16 12.8729 16 14C16 15.0897 15 16 14.027 16C13 16 12.5 15.5 12 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function GoogleGemini(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M3 12C7.97056 12 12 7.97056 12 3C12 7.97056 16.0294 12 21 12C16.0294 12 12 16.0294 12 21C12 16.0294 7.97056 12 3 12Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function GridView(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M8.99998 3H3.99998C3.4477 3 2.99998 3.44772 2.99998 4V9C2.99998 9.55228 3.4477 10 3.99998 10H8.99998C9.55227 10 9.99998 9.55228 9.99998 9V4C9.99998 3.44772 9.55227 3 8.99998 3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M20 3H15C14.4477 3 14 3.44772 14 4V9C14 9.55228 14.4477 10 15 10H20C20.5523 10 21 9.55228 21 9V4C21 3.44772 20.5523 3 20 3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M8.99998 14H3.99998C3.4477 14 2.99998 14.4477 2.99998 15V20C2.99998 20.5523 3.4477 21 3.99998 21H8.99998C9.55227 21 9.99998 20.5523 9.99998 20V15C9.99998 14.4477 9.55227 14 8.99998 14Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M20 14H15C14.4477 14 14 14.4477 14 15V20C14 20.5523 14.4477 21 15 21H20C20.5523 21 21 20.5523 21 20V15C21 14.4477 20.5523 14 20 14Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Grok(props: IconProps) {
  return (
    <Ikon {...props}>
      <path d="M8 17.5L16 7.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />{" "}
      <path
        d="M19.5 2.5C20.6046 2.5 21.5 3.39543 21.5 4.5V19.5C21.5 20.6046 20.6046 21.5 19.5 21.5H4.5C3.39543 21.5 2.5 20.6046 2.5 19.5V4.5C2.5 3.39543 3.39543 2.5 4.5 2.5H19.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function HandHeart(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M2 20V12C2 11.4477 2.44772 11 3 11H5C5.55228 11 6 11.4477 6 12V20C6 20.5523 5.55228 21 5 21H3C2.44772 21 2 20.5523 2 20Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M6 12H7.76845C8.58101 12 9.38511 12.165 10.132 12.4851L14.8574 14.5103C15.5506 14.8074 16 15.489 16 16.2431C16 16.9373 15.4373 17.5 14.7431 17.5H14.0986C13.3729 17.5 12.6538 17.3615 11.98 17.092L10.5 16.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M16 11C16 11 11 7.82353 11 4.75C11 3.23122 12.0526 2 13.5 2C14.25 2 15 2.26471 16 3.32353C17 2.26471 17.75 2 18.5 2C19.9474 2 21 3.23122 21 4.75C21 7.82353 16 11 16 11Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M14 17.5H20.5749C21.362 17.5 22 18.138 22 18.9251C22 19.5613 21.5782 20.1205 20.9664 20.2953L15.7451 21.7871C15.2508 21.9283 14.7392 22 14.2251 22C13.7437 22 13.2645 21.9372 12.7994 21.8132L6 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Headphones(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M20.0849 17C20.5849 15.5 21 13.4368 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 13.4368 3.41512 15.5 3.91512 17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M8.97651 19.6043L7.23857 14.6127C7.05341 14.1466 6.4617 13.9131 5.97493 14.0297C4.46441 14.5333 3.6462 16.1718 4.14742 17.6895L4.58543 19.0158C5.08664 20.5334 6.71747 21.3555 8.22799 20.8519C8.68896 20.6556 9.10449 20.0897 8.97651 19.6043Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M15.0235 19.6043L16.7614 14.6127C16.9466 14.1466 17.5383 13.9131 18.0251 14.0297C19.5356 14.5333 20.3538 16.1718 19.8526 17.6895L19.4146 19.0158C18.9134 20.5334 17.2825 21.3555 15.772 20.8519C15.311 20.6556 14.8955 20.0897 15.0235 19.6043Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function HelpCircle(props: IconProps) {
  return (
    <Ikon {...props}>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M9.5 9.5C9.5 8.11929 10.6193 7 12 7C13.3807 7 14.5 8.11929 14.5 9.5C14.5 10.3569 14.0689 11.1131 13.4117 11.5636C12.7283 12.0319 12 12.6716 12 13.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M12.125 16.75H12M12.25 16.75C12.25 16.8881 12.1381 17 12 17C11.8619 17 11.75 16.8881 11.75 16.75C11.75 16.6119 11.8619 16.5 12 16.5C12.1381 16.5 12.25 16.6119 12.25 16.75Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Home01(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M3 9.98834V19.5C3 20.6046 3.89543 21.5 5 21.5H19C20.1046 21.5 21 20.6046 21 19.5V9.98834C21 9.3654 20.7097 8.77803 20.2149 8.39963L12.8972 2.80373C12.6396 2.60673 12.3243 2.5 12 2.5C11.6757 2.5 11.3604 2.60673 11.1028 2.80373L3.7851 8.39963C3.29026 8.77804 3 9.3654 3 9.98834Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function InformationCircle(props: IconProps) {
  return (
    <Ikon {...props}>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M12 16V12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M12.125 8.25H12M12.25 8.25C12.25 8.11193 12.1381 8 12 8C11.8619 8 11.75 8.11193 11.75 8.25C11.75 8.38807 11.8619 8.5 12 8.5C12.1381 8.5 12.25 8.38807 12.25 8.25Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function JusticeScale01(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M12 5V22M12 22H9.5M12 22H14.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M21 13L18.5 8L16 13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M8 13L5.5 8L3 13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M3.5 8H5.0482C6.31166 8 7.5375 7.471 8.5241 6.5C10.5562 4.5 13.4438 4.5 15.4759 6.5C16.4625 7.471 17.6883 8 18.9518 8H20.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M13.5 3.5C13.5 4.32843 12.8284 5 12 5C11.1716 5 10.5 4.32843 10.5 3.5C10.5 2.67157 11.1716 2 12 2C12.8284 2 13.5 2.67157 13.5 3.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M5.5 16.5C7.433 16.5 9 14.933 9 13H2C2 14.933 3.567 16.5 5.5 16.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M18.5 16.5C20.433 16.5 22 14.933 22 13H15C15 14.933 16.567 16.5 18.5 16.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function LeftToRightListBullet(props: IconProps) {
  return (
    <Ikon {...props}>
      <path d="M8 5L20 5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />{" "}
      <path d="M8 12L20 12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />{" "}
      <path d="M8 19L20 19" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />{" "}
      <path
        d="M4.375 5H4.25M4.5 5C4.5 5.13807 4.38807 5.25 4.25 5.25C4.11193 5.25 4 5.13807 4 5C4 4.86193 4.11193 4.75 4.25 4.75C4.38807 4.75 4.5 4.86193 4.5 5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M4.375 12H4.25M4.5 12C4.5 12.1381 4.38807 12.25 4.25 12.25C4.11193 12.25 4 12.1381 4 12C4 11.8619 4.11193 11.75 4.25 11.75C4.38807 11.75 4.5 11.8619 4.5 12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M4.375 19H4.25M4.5 19C4.5 19.1381 4.38807 19.25 4.25 19.25C4.11193 19.25 4 19.1381 4 19C4 18.8619 4.11193 18.75 4.25 18.75C4.38807 18.75 4.5 18.8619 4.5 19Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function LegalDocument01(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M3 5V19C3 20.6569 4.34315 22 6 22H18C19.6569 22 21 20.6569 21 19V5C21 3.34315 19.6569 2 18 2H6C4.34315 2 3 3.34315 3 5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M11.5 10.5005L8.5 13.5M12.0002 6.00012L16.0005 10.0005L13.5004 12.5006L9.5 8.5003L12.0002 6.00012Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M8.5 18H15.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function LockKeyhole(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M16.5 9V6.5C16.5 4.01472 14.4853 2 12 2C9.51472 2 7.5 4.01472 7.5 6.5V9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M18 9H6.00018C4.89554 9 4.00008 9.89554 4.00018 11.0002L4.00102 20.0002C4.00112 21.1047 4.89652 22 6.00101 22H18C19.1046 22 20 21.1046 20 20V11C20 9.89543 19.1046 9 18 9Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />{" "}
      <circle cx="12" cy="15.5" r="2" stroke="currentColor" strokeWidth="1.5" />
    </Ikon>
  );
}

export function Mistral(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M10.5 16.5V19.5H1.5V16.5H4.5V4.5H7.5V7.5H10.5V10.5H13.5V7.5H16.5V4.5H19.5V16.5H22.5V19.5H13.5V16.5M10.5 16.5H13.5M10.5 16.5H7.5V13.5H10.5V16.5ZM13.5 16.5H16.5V13.5H13.5V16.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Moon02(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M21.5 14.0784C20.3003 14.7189 18.9301 15.0821 17.4751 15.0821C12.7491 15.0821 8.91792 11.2509 8.91792 6.52485C8.91792 5.06986 9.28105 3.69968 9.92163 2.5C5.66765 3.49698 2.5 7.31513 2.5 11.8731C2.5 17.1899 6.8101 21.5 12.1269 21.5C16.6849 21.5 20.503 18.3324 21.5 14.0784Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function MoreVertical(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M12.0001 12V11.5M12.0001 6.00005V5.50005M12.0001 18V17.5M13.0001 12C13.0001 11.4478 12.5524 11 12.0001 11C11.4478 11 11.0001 11.4478 11.0001 12C11.0001 12.5523 11.4478 13 12.0001 13C12.5524 13 13.0001 12.5523 13.0001 12ZM13.0001 6.00005C13.0001 5.44776 12.5524 5.00005 12.0001 5.00005C11.4478 5.00005 11.0001 5.44776 11.0001 6.00005C11.0001 6.55233 11.4478 7.00005 12.0001 7.00005C12.5524 7.00005 13.0001 6.55233 13.0001 6.00005ZM13.0001 18C13.0001 17.4478 12.5524 17 12.0001 17C11.4478 17 11.0001 17.4478 11.0001 18C11.0001 18.5523 11.4478 19 12.0001 19C12.5524 19 13.0001 18.5523 13.0001 18Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Next(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M5.5241 19.0621C4.85783 19.4721 4 18.9928 4 18.2104V5.78956C4 5.00724 4.85783 4.52789 5.5241 4.93791L15.6161 11.1483C16.2506 11.5388 16.2506 12.4612 15.6161 12.8517L5.5241 19.0621Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M20 4.5L20 19.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Pause(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M5 20H9C9.55228 20 10 19.5523 10 19V5C10 4.44772 9.55228 4 9 4H5C4.44772 4 4 4.44772 4 5V19C4 19.5523 4.44772 20 5 20Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M15 20H19C19.5523 20 20 19.5523 20 19V5C20 4.44772 19.5523 4 19 4H15C14.4477 4 14 4.44772 14 5V19C14 19.5523 14.4477 20 15 20Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Play(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M7.5241 19.0621C6.85783 19.4721 6 18.9928 6 18.2104V5.78956C6 5.00724 6.85783 4.52789 7.5241 4.93791L17.6161 11.1483C18.2506 11.5388 18.2506 12.4612 17.6161 12.8517L7.5241 19.0621Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function PlusSign(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M12 4V20M20 12H4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Previous(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M18.4759 19.0621C19.1422 19.4721 20 18.9928 20 18.2104V5.78956C20 5.00724 19.1422 4.52789 18.4759 4.93791L8.38394 11.1483C7.74941 11.5388 7.74941 12.4612 8.38394 12.8517L18.4759 19.0621Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M4 19.5L4 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function QuoteDown(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M22 10V6C22 4.89543 21.1046 4 20 4L16 4C14.8954 4 14 4.89543 14 6V10C14 11.1046 14.8954 12 16 12H20C21.1046 12 22 11.1046 22 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M22 9.5V14C22 17.3137 19.3137 20 16 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M10 10V6C10 4.89543 9.10457 4 8 4L4 4C2.89543 4 2 4.89543 2 6L2 10C2 11.1046 2.89543 12 4 12H8C9.10457 12 10 11.1046 10 10Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M10 9.5V14C10 17.3137 7.31371 20 4 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Quran01(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M11.9991 12.5L20 6.5L17.6471 3.5L11.9991 8L5.88235 3.5L4 6.5L11.9991 12.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M22 8.5L6 20.5V16M2 8.5L18 20.5V16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Search01(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M17 17L21 21"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function SearchList02(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M2.5 9.5H6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M2.5 14.5H6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M2.5 19.5H18.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M18.5355 13.0355L21.5 16M20 9.5C20 6.73858 17.7614 4.5 15 4.5C12.2386 4.5 10 6.73858 10 9.5C10 12.2614 12.2386 14.5 15 14.5C17.7614 14.5 20 12.2614 20 9.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Sun01(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M16.9991 12C16.9991 14.7614 14.7605 17 11.9991 17C9.23766 17 6.99908 14.7614 6.99908 12C6.99908 9.23858 9.23766 7 11.9991 7C14.7605 7 16.9991 9.23858 16.9991 12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M12.1247 3.25H11.9997M12.1242 20.75H11.9992M20.75 12.125V12M3.25 12.125V12M18.2752 5.90098L18.1868 5.81259M5.90051 18.275L5.81212 18.1866M18.0987 18.2756L18.187 18.1872M5.72429 5.9012L5.81267 5.81282M12.2497 3.25C12.2497 3.38807 12.1378 3.5 11.9997 3.5C11.8616 3.5 11.7497 3.38807 11.7497 3.25C11.7497 3.11193 11.8616 3 11.9997 3C12.1378 3 12.2497 3.11193 12.2497 3.25ZM12.2492 20.75C12.2492 20.8881 12.1373 21 11.9992 21C11.8611 21 11.7492 20.8881 11.7492 20.75C11.7492 20.6119 11.8611 20.5 11.9992 20.5C12.1373 20.5 12.2492 20.6119 12.2492 20.75ZM20.75 12.25C20.6119 12.25 20.5 12.1381 20.5 12C20.5 11.8619 20.6119 11.75 20.75 11.75C20.8881 11.75 21 11.8619 21 12C21 12.1381 20.8881 12.25 20.75 12.25ZM3.25 12.25C3.11193 12.25 3 12.1381 3 12C3 11.8619 3.11193 11.75 3.25 11.75C3.38807 11.75 3.5 11.8619 3.5 12C3.5 12.1381 3.38807 12.25 3.25 12.25ZM18.3636 5.98937C18.266 6.087 18.1077 6.087 18.01 5.98937C17.9124 5.89174 17.9124 5.73345 18.01 5.63582C18.1077 5.53819 18.266 5.53819 18.3636 5.63582C18.4612 5.73345 18.4612 5.89174 18.3636 5.98937ZM5.9889 18.3634C5.89127 18.461 5.73297 18.461 5.63534 18.3634C5.53771 18.2658 5.53771 18.1075 5.63534 18.0099C5.73297 17.9122 5.89127 17.9122 5.9889 18.0099C6.08653 18.1075 6.08653 18.2658 5.9889 18.3634ZM18.0103 18.364C17.9126 18.2663 17.9126 18.108 18.0103 18.0104C18.1079 17.9128 18.2662 17.9128 18.3638 18.0104C18.4614 18.108 18.4614 18.2663 18.3638 18.364C18.2662 18.4616 18.1079 18.4616 18.0103 18.364ZM5.6359 5.98959C5.53827 5.89196 5.53827 5.73367 5.6359 5.63604C5.73353 5.53841 5.89182 5.53841 5.98945 5.63604C6.08708 5.73367 6.08708 5.89196 5.98945 5.98959C5.89182 6.08722 5.73353 6.08722 5.6359 5.98959Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Tasbih(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M7.58935 15L2.11596 17.9848C2.05777 18.0166 2.04599 18.0951 2.09233 18.1425L3.97733 20.0709M9 16.553L6.00641 21.886C5.97417 21.9435 5.89616 21.9546 5.84915 21.9084L3.97733 20.0709M3.97733 20.0709L4.95682 19.0361"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M19.6568 6.76742C18.9873 7.43695 17.9019 7.43695 17.2324 6.76742C16.5629 6.0979 16.5629 5.01238 17.2324 4.34285C17.9019 3.67333 18.9873 3.67333 19.6568 4.34285C20.3263 5.01238 20.3263 6.0979 19.6568 6.76742Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M10.7672 15.6575C10.0977 16.327 9.01223 16.327 8.34274 15.6575C7.67325 14.988 7.67325 13.9025 8.34274 13.2329C9.01223 12.5634 10.0977 12.5634 10.7672 13.2329C11.4367 13.9025 11.4367 14.988 10.7672 15.6575Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M17.2324 15.6575C16.5629 14.988 16.5629 13.9025 17.2324 13.2329C17.9019 12.5634 18.9873 12.5634 19.6568 13.2329C20.3263 13.9025 20.3263 14.988 19.6568 15.6575C18.9873 16.327 17.9019 16.327 17.2324 15.6575Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M8.34274 6.76742C7.67325 6.0979 7.67325 5.01238 8.34274 4.34285C9.01223 3.67333 10.0977 3.67333 10.7672 4.34285C11.4367 5.01238 11.4367 6.0979 10.7672 6.76742C10.0977 7.43695 9.01223 7.43695 8.34274 6.76742Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M20.2857 11.714C19.3388 11.714 18.5713 10.9464 18.5713 9.99958C18.5713 9.05272 19.3388 8.28515 20.2857 8.28515C21.2325 8.28515 22 9.05272 22 9.99958C22 10.9464 21.2325 11.714 20.2857 11.714Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M7.71434 11.7148C6.76754 11.7148 6 10.9472 6 10.0004C6 9.05351 6.76754 8.28594 7.71434 8.28594C8.66115 8.28594 9.42869 9.05351 9.42869 10.0004C9.42869 10.9472 8.66115 11.7148 7.71434 11.7148Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M12.2853 16.2856C12.2853 15.3387 13.0528 14.5711 13.9996 14.5711C14.9464 14.5711 15.7139 15.3387 15.7139 16.2856C15.7139 17.2324 14.9464 18 13.9996 18C13.0528 18 12.2853 17.2324 12.2853 16.2856Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M12.2853 3.71443C12.2853 2.76758 13.0528 2 13.9996 2C14.9464 2 15.7139 2.76758 15.7139 3.71443C15.7139 4.66128 14.9464 5.42886 13.9996 5.42886C13.0528 5.42886 12.2853 4.66128 12.2853 3.71443Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function TextFont(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M14 19L9 5H7L2 19M4 14H12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M16.5 11.5L16.6298 11.3053C17.1735 10.4898 18.0887 10 19.0688 10C20.6876 10 22 11.3124 22 12.9312V18.5M22 14H18.561C17.1466 14 16 15.1466 16 16.561C16 17.908 17.092 19 18.439 19H18.7408C19.2376 19 19.725 18.865 20.151 18.6094L20.3033 18.518C21.3559 17.8864 22 16.7489 22 15.5213V14Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Tick02(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M4.25 13.5L8.75 18L19.75 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function AiChat02Duotone(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        opacity="0.4"
        d="M14 2.5H10C5.58172 2.5 2 6.28071 2 10.9444V12C2 14.415 2.96038 16.5932 4.5 18.1323C4.5 18.903 4.3 20.6556 3.5 21.5C6 21.5 7.50483 20.0256 7.50483 20.0256C8.28999 20.2974 9.12873 20.4444 10 20.4444H14C18.4183 20.4444 22 16.6637 22 12V10.9444C22 6.28071 18.4183 2.5 14 2.5Z"
        fill="currentColor"
      />{" "}
      <path
        d="M14 2.5H10C5.58172 2.5 2 6.28071 2 10.9444V12C2 14.415 2.96038 16.5932 4.5 18.1323C4.5 18.903 4.3 20.6556 3.5 21.5C6 21.5 7.50483 20.0256 7.50483 20.0256C8.28999 20.2974 9.12873 20.4444 10 20.4444H14C18.4183 20.4444 22 16.6637 22 12V10.9444C22 6.28071 18.4183 2.5 14 2.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M16.75 8.5C16.75 8.08579 16.4142 7.75 16 7.75C15.5858 7.75 15.25 8.08579 15.25 8.5H16H16.75ZM15.25 14.5C15.25 14.9142 15.5858 15.25 16 15.25C16.4142 15.25 16.75 14.9142 16.75 14.5H16H15.25ZM10.2222 8.5V7.75C9.90847 7.75 9.62788 7.9453 9.51891 8.23951L10.2222 8.5ZM10.7778 8.5L11.4811 8.23951C11.3721 7.9453 11.0915 7.75 10.7778 7.75V8.5ZM7.29669 14.2395C7.15283 14.6279 7.35109 15.0594 7.73951 15.2033C8.12794 15.3472 8.55945 15.1489 8.70331 14.7605L8 14.5L7.29669 14.2395ZM12.2967 14.7605C12.4406 15.1489 12.8721 15.3472 13.2605 15.2033C13.6489 15.0594 13.8472 14.6279 13.7033 14.2395L13 14.5L12.2967 14.7605ZM16 8.5H15.25V14.5H16H16.75V8.5H16ZM10.2222 8.5V9.25H10.7778V8.5V7.75H10.2222V8.5ZM8 14.5L8.70331 14.7605L9.5922 12.3605L8.88889 12.1L8.18558 11.8395L7.29669 14.2395L8 14.5ZM8.88889 12.1L9.5922 12.3605L10.9255 8.76049L10.2222 8.5L9.51891 8.23951L8.18558 11.8395L8.88889 12.1ZM10.7778 8.5L10.0745 8.76049L11.4078 12.3605L12.1111 12.1L12.8144 11.8395L11.4811 8.23951L10.7778 8.5ZM12.1111 12.1L11.4078 12.3605L12.2967 14.7605L13 14.5L13.7033 14.2395L12.8144 11.8395L12.1111 12.1ZM8.88889 12.1V12.85H12.1111V12.1V11.35H8.88889V12.1Z"
        fill="currentColor"
      />
    </Ikon>
  );
}

export function Book02Duotone(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        opacity="0.4"
        d="M20 18H6C4.89543 18 4 18.8954 4 20V4C4 2.89543 4.89543 2 6 2H20V18Z"
        fill="currentColor"
      />{" "}
      <path
        d="M15.501 7H8.50098M12.5 11H8.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M20 22H6C4.89543 22 4 21.1046 4 20M4 20C4 18.8954 4.89543 18 6 18H20V2H6C4.89543 2 4 2.89543 4 4V20Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M19.5 18C19.5 18 18.5 18.7628 18.5 20C18.5 21.2372 19.5 22 19.5 22"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function BookOpen01Duotone(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        opacity="0.4"
        d="M7.99988 3.5H3.0005C2.44821 3.5 2 3.94858 2 4.50087V16.9991C2 17.5514 2.44765 18 2.99993 18H8.95053C10.433 18 11.7093 19.0464 12 20.5C12.2907 19.0464 13.5671 18 15.0495 18H21C21.5523 18 22 17.5514 22 16.9991V4.50087C22 3.94858 21.5523 3.5 21 3.5H16C14 3.5 12.9443 4.24097 12 5.5C11.0557 4.24097 10 3.5 7.99988 3.5Z"
        fill="currentColor"
      />{" "}
      <path
        d="M7.99988 3.5H3.0005C2.44821 3.5 2 3.94858 2 4.50087V16.9991C2 17.5514 2.44765 18 2.99993 18H8.95053C10.433 18 11.7093 19.0464 12 20.5V5.5C11.0557 4.24097 10 3.5 7.99988 3.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M16 3.5H21C21.5523 3.5 22 3.94858 22 4.50087V16.9991C22 17.5514 21.5523 18 21 18H15.0495C13.5671 18 12.2907 19.0464 12 20.5V5.5C12.9443 4.24097 14 3.5 16 3.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function FileEmpty02Duotone(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        opacity="0.4"
        d="M18 22H6C4.89543 22 4 21.1046 4 20L4 4C4 2.89543 4.89543 2 6 2H13L12.998 7C12.998 8.10457 13.8935 9 14.998 9L20 9L20 20C20 21.1046 19.1046 22 18 22Z"
        fill="currentColor"
      />{" "}
      <path
        d="M20 20V9L13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M13 2V7C13 8.10457 13.8954 9 15 9H20"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function HelpCircleDuotone(props: IconProps) {
  return (
    <Ikon {...props}>
      <circle opacity="0.4" cx="12" cy="12" r="10" fill="currentColor" />{" "}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M9.5 9.5C9.5 8.11929 10.6193 7 12 7C13.3807 7 14.5 8.11929 14.5 9.5C14.5 10.3569 14.0689 11.1131 13.4117 11.5636C12.7283 12.0319 12 12.6716 12 13.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M12.125 16.75H12M12.25 16.75C12.25 16.8881 12.1381 17 12 17C11.8619 17 11.75 16.8881 11.75 16.75C11.75 16.6119 11.8619 16.5 12 16.5C12.1381 16.5 12.25 16.6119 12.25 16.75Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function Home01Duotone(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        opacity="0.4"
        d="M3 9.98834V19.5C3 20.6046 3.89543 21.5 5 21.5H19C20.1046 21.5 21 20.6046 21 19.5V9.98834C21 9.3654 20.7097 8.77803 20.2149 8.39963L12.8972 2.80373C12.6396 2.60673 12.3243 2.5 12 2.5C11.6757 2.5 11.3604 2.60673 11.1028 2.80373L3.7851 8.39963C3.29026 8.77804 3 9.3654 3 9.98834Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M3 9.98834V19.5C3 20.6046 3.89543 21.5 5 21.5H19C20.1046 21.5 21 20.6046 21 19.5V9.98834C21 9.3654 20.7097 8.77803 20.2149 8.39963L12.8972 2.80373C12.6396 2.60673 12.3243 2.5 12 2.5C11.6757 2.5 11.3604 2.60673 11.1028 2.80373L3.7851 8.39963C3.29026 8.77804 3 9.3654 3 9.98834Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function InformationCircleDuotone(props: IconProps) {
  return (
    <Ikon {...props}>
      <circle opacity="0.4" cx="12" cy="12" r="10" fill="currentColor" />{" "}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M12 16V12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M12.125 8.25H12M12.25 8.25C12.25 8.11193 12.1381 8 12 8C11.8619 8 11.75 8.11193 11.75 8.25C11.75 8.38807 11.8619 8.5 12 8.5C12.1381 8.5 12.25 8.38807 12.25 8.25Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}

export function SearchList02Duotone(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        opacity="0.4"
        d="M20 9.5C20 6.73858 17.7614 4.5 15 4.5C12.2386 4.5 10 6.73858 10 9.5C10 12.2614 12.2386 14.5 15 14.5C17.7614 14.5 20 12.2614 20 9.5Z"
        fill="currentColor"
      />{" "}
      <path
        d="M2.5 9.5H6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M2.5 14.5H6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M2.5 19.5H18.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />{" "}
      <path
        d="M18.5355 13.0355L21.5 16M20 9.5C20 6.73858 17.7614 4.5 15 4.5C12.2386 4.5 10 6.73858 10 9.5C10 12.2614 12.2386 14.5 15 14.5C17.7614 14.5 20 12.2614 20 9.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </Ikon>
  );
}
