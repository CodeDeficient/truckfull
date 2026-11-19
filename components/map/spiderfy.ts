export interface SpiderfyPoint {
  lat: number;
  lng: number;
}

export function spiderfy(
  lng: number,
  lat: number,
  count: number,
  spreadDistance: number = 0.0005,
): SpiderfyPoint[] {
  if (count <= 0) {
    return [];
  }

  if (count === 1) {
    return [{ lat, lng }];
  }

  const points: SpiderfyPoint[] = [];
  const angleStep = (2 * Math.PI) / count;

  for (let i = 0; i < count; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const offsetLat = spreadDistance * Math.cos(angle);
    const offsetLng = spreadDistance * Math.sin(angle);

    points.push({
      lat: lat + offsetLat,
      lng: lng + offsetLng,
    });
  }

  return points;
}