export type MetepecCoordinate = [latitude: number, longitude: number];

const boundary: Array<[longitude: number, latitude: number]> = [
  [-99.6082038, 19.2158996],
  [-99.6026453, 19.2160089],
  [-99.5982391, 19.2185702],
  [-99.6007305, 19.2197712],
  [-99.6013737, 19.2233565],
  [-99.5900553, 19.2202698],
  [-99.5135024, 19.2231738],
  [-99.5132852, 19.2286607],
  [-99.5145478, 19.2303075],
  [-99.5198278, 19.2389752],
  [-99.5400504, 19.2378195],
  [-99.5388716, 19.23957],
  [-99.5399785, 19.2400215],
  [-99.5398375, 19.2453818],
  [-99.5377009, 19.249846],
  [-99.549425, 19.2505218],
  [-99.5494096, 19.2491225],
  [-99.5525765, 19.2494611],
  [-99.5560225, 19.270821],
  [-99.5680979, 19.2652348],
  [-99.568139, 19.2777325],
  [-99.5631986, 19.2778526],
  [-99.5637831, 19.2859586],
  [-99.6060133, 19.2871671],
  [-99.606951, 19.2755868],
  [-99.6323657, 19.2720045],
  [-99.6326639, 19.2682713],
  [-99.6364243, 19.2707171],
  [-99.6367057, 19.2662173],
  [-99.634475, 19.2647643],
  [-99.6454634, 19.2647324],
  [-99.6434522, 19.2593689],
  [-99.6356755, 19.2528014],
  [-99.630483, 19.2453691],
  [-99.6346866, 19.238125],
  [-99.6329674, 19.2381282],
  [-99.6330211, 19.2341028],
  [-99.6350827, 19.2339829],
  [-99.6356543, 19.230117],
  [-99.6411419, 19.2303409],
  [-99.6434498, 19.228822],
  [-99.6435654, 19.2261673],
  [-99.6459048, 19.2260429],
  [-99.647046, 19.2210856],
  [-99.6450521, 19.2211681],
  [-99.6452252, 19.2179339],
  [-99.640751, 19.2180912],
  [-99.6386837, 19.2160844],
  [-99.6352788, 19.2162644],
  [-99.6342142, 19.2179727],
  [-99.6308201, 19.2168161],
  [-99.6270698, 19.2200681],
  [-99.6166623, 19.2194045],
  [-99.6165309, 19.2171989],
  [-99.6117713, 19.2175272],
  [-99.6116865, 19.2156544],
];

export const METEPEC_BOUNDARY: MetepecCoordinate[] = boundary.map(
  ([longitude, latitude]) => [latitude, longitude],
);

export function isInsideMetepec(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }

  const point = [longitude, latitude] as const;
  let inside = false;

  for (let index = 0, previous = boundary.length - 1; index < boundary.length; previous = index, index += 1) {
    const [currentX, currentY] = boundary[index];
    const [previousX, previousY] = boundary[previous];
    const cross =
      (point[1] - currentY) * (previousX - currentX) -
      (point[0] - currentX) * (previousY - currentY);
    const withinSegment =
      Math.abs(cross) < 1e-8 &&
      point[0] >= Math.min(currentX, previousX) - 1e-8 &&
      point[0] <= Math.max(currentX, previousX) + 1e-8 &&
      point[1] >= Math.min(currentY, previousY) - 1e-8 &&
      point[1] <= Math.max(currentY, previousY) + 1e-8;

    if (withinSegment) {
      return true;
    }

    const crossesLatitude = (currentY > point[1]) !== (previousY > point[1]);
    const crossingLongitude =
      ((previousX - currentX) * (point[1] - currentY)) / (previousY - currentY) +
      currentX;

    if (crossesLatitude && point[0] < crossingLongitude) {
      inside = !inside;
    }
  }

  return inside;
}
