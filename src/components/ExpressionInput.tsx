import React, { useState, useEffect, useRef } from "react";
import { evaluate } from "mathjs";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ExpressionInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onValueChange: (value: number) => void;
  onDisplayChange?: (display: string) => void;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

export const ExpressionInput: React.FC<ExpressionInputProps> = ({
  value,
  onValueChange,
  onDisplayChange,
  className,
  inputRef,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState(value.toString());
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(value.toString());
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    let finalValue = displayValue;
    
    if (displayValue.startsWith("=")) {
      try {
        const expression = displayValue.substring(1);
        const result = evaluate(expression);
        if (typeof result === "number" && !isNaN(result)) {
          onValueChange(result);
          setDisplayValue(result.toString());
        }
      } catch (e) {
        console.error("Invalid expression", e);
        setDisplayValue(value.toString());
      }
    } else {
      const num = parseFloat(displayValue);
      if (!isNaN(num)) {
        onValueChange(num);
      } else {
        setDisplayValue(value.toString());
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
    onDisplayChange?.(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    }
    props.onKeyDown?.(e);
  };

  return (
    <input
      {...props}
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={() => setIsEditing(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-full px-2 py-1 bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded outline-none transition-all",
        displayValue.startsWith("=") && "text-blue-600 font-medium",
        className
      )}
    />
  );
};
