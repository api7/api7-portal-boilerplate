import background from './ProductAvatarBg';

const ProductAvatar: React.FC<
  { text: string } & React.SVGAttributes<HTMLOrSVGElement>
> = ({ text, ...iconProps }) => (
  <div className="center relative">
    <div className="rounded overflow-hidden">
      {/* Random icon generation by text */}
      {background[text.slice(0, 2).charCodeAt(0) % 7]({
        width: '60px',
        height: '60px',
        ...iconProps,
      })}
    </div>
    <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-medium text-white text-xl">
      {/* Determine if text is a letter, if it is a letter then take the first two characters, otherwise take the first character */}
      {text.slice(0, /^[a-zA-Z]+$/.test(text[0]) ? 2 : 1)}
    </p>
  </div>
);

export default ProductAvatar;
