import { Input } from '@/components/ui/input';

interface SearchInputWithIconProps {
  readonly value: string;
  readonly onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  readonly placeholder: string;
}

/**
 * Renders a search input field without an icon.
 * @example
 * SearchInputWithIcon({
 *   value: 'search query',
 *   onChange: handleInputChange,
 *   onKeyDown: handleKeyDown,
 *   placeholder: 'Search...',
 * })
 * <div>...</div>
 * @param {string} value - The current value of the input field.
 * @param {function} onChange - A callback function to handle input value changes.
 * @param {function} onKeyDown - A callback function to handle key down events.
 * @param {string} placeholder - The placeholder text for the input field.
 * @returns {JSX.Element} A JSX element representing the search input without an icon.
 * @description
 *   - Clean search input without visual icon clutter.
 *   - Applies specific styling for dark mode UI components.
 */
export function SearchInputWithIcon({
  value,
  onChange,
  onKeyDown,
  placeholder,
}: SearchInputWithIconProps) {
  return (
    <div className="grow min-w-[200px]">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full dark:bg-slate-700 dark:text-gray-100 dark:placeholder:text-gray-400"
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
