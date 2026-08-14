import copy from 'copy-to-clipboard';

export const copyToClipboard = (text: string): Promise<boolean> => copy(text);
