import { IconProps, Template } from "./template";

const MoneyIconCircle = (props: IconProps) => {
  return (
    <Template {...props}>
      <path
        d="M12 6.90796V18.908M9 16.09L9.879 16.749C11.05 17.628 12.949 17.628 14.121 16.749C15.293 15.87 15.293 14.446 14.121 13.567C13.536 13.127 12.768 12.908 12 12.908C11.275 12.908 10.55 12.688 9.997 12.249C8.891 11.37 8.891 9.94596 9.997 9.06696C11.103 8.18796 12.897 8.18796 14.003 9.06696L14.418 9.39696M21 12.908C21 14.0899 20.7672 15.2602 20.3149 16.3521C19.8626 17.444 19.1997 18.4362 18.364 19.2719C17.5282 20.1076 16.5361 20.7706 15.4442 21.2229C14.3522 21.6752 13.1819 21.908 12 21.908C10.8181 21.908 9.64778 21.6752 8.55585 21.2229C7.46392 20.7706 6.47177 20.1076 5.63604 19.2719C4.80031 18.4362 4.13738 17.444 3.68508 16.3521C3.23279 15.2602 3 14.0899 3 12.908C3 10.521 3.94821 8.23183 5.63604 6.544C7.32387 4.85617 9.61305 3.90796 12 3.90796C14.3869 3.90796 16.6761 4.85617 18.364 6.544C20.0518 8.23183 21 10.521 21 12.908Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Template>
  );
};

export default MoneyIconCircle;
