import background from './ProductAvatarBg';

const ProductAvatar: React.FC<
  { text: string } & React.SVGAttributes<HTMLOrSVGElement>
> = ({ text, ...iconProps }) => (
  <div className="relative inline-flex shrink-0 items-center justify-center">
    <div className="rounded overflow-hidden">
      {/* Random icon generation by text */}
      {background[text.slice(0, 2).charCodeAt(0) % 7]({
        width: '60px',
        height: '60px',
        ...iconProps,
      }) as React.ReactNode}
    </div>
    <p className="absolute left-1/2 top-1/2 m-0 -translate-x-1/2 -translate-y-1/2 text-xl font-medium leading-none text-white">
      {/* Determine if text is a letter, if it is a letter then take the first two characters, otherwise take the first character */}
      {text.slice(0, /^[a-zA-Z]+$/.test(text[0]) ? 2 : 1)}
    </p>
  </div>
);

export default ProductAvatar;
