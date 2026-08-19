export function shouldTransitionToArrivedAfterProximityCheck(
  locationWasAvailable: boolean,
  withinProximity: boolean,
): boolean {
  return !locationWasAvailable || !withinProximity;
}
