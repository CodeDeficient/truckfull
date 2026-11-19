const BINARY_TAG = 'b';
const MAP_TAG = 'm';

const isPlainObject = (value) => {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || Object.getPrototypeOf(proto) === null;
};

const encodeValue = (value) => {
  if (ArrayBuffer.isView(value)) {
    return {
      __t: BINARY_TAG,
      d: Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('base64'),
    };
  }
  if (Object.prototype.toString.call(value) === '[object Map]') {
    return {
      __t: MAP_TAG,
      d: Array.from(value, ([key, item]) => [encodeValue(key), encodeValue(item)]),
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => encodeValue(item));
  }
  if (isPlainObject(value)) {
    const encoded = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) encoded[key] = encodeValue(item);
    }
    return encoded;
  }
  return value;
};

const decodeTagged = (value) => {
  if (value.__t === BINARY_TAG && typeof value.d === 'string') {
    return Buffer.from(value.d, 'base64');
  }
  if (value.__t === MAP_TAG && Array.isArray(value.d)) {
    return new Map(value.d.map(([key, item]) => [decodeValue(key), decodeValue(item)]));
  }
  return null;
};

const decodeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => decodeValue(item));
  }
  if (isPlainObject(value)) {
    const tagged = decodeTagged(value);
    if (tagged !== null) return tagged;
    const decoded = {};
    for (const [key, item] of Object.entries(value)) {
      decoded[key] = decodeValue(item);
    }
    return decoded;
  }
  return value;
};

export const serializeEntry = (value) => JSON.stringify(encodeValue(value));

export const deserializeEntry = (text) => decodeValue(JSON.parse(text));
