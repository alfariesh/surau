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

export function MinusSign(props: IconProps) {
  return (
    <Ikon {...props}>
      <path
        d="M20 12L4 12"
        stroke="currentColor"
        strokeLinecap="round"
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
