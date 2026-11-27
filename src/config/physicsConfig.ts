export interface PhysicsConfig {
  world: {
    pixelsPerMeter: number;
    gravityY: number;
    fixedDt: number;
    maxFrameDt: number;
    velocityIterations: number;
    positionIterations: number;
  };
  chassis: {
    massKg: number;
    inertia: number;
    centerOfMassX: number;
    centerOfMassY: number;
    linearDamping: number;
    angularDamping: number;
    friction: number;
    restitution: number;
  };
  wheels: {
    radius: number;
    rearOffsetX: number;
    rearOffsetY: number;
    frontOffsetX: number;
    frontOffsetY: number;
    density: number;
    friction: number;
    restitution: number;
    angularDamping: number;
  };
  suspension: {
    rearFrequencyHz: number;
    rearDampingRatio: number;
    frontFrequencyHz: number;
    frontDampingRatio: number;
    axisX: number;
    axisY: number;
    maxCompression: number;
    maxExtension: number;
    bumpStopStiffness: number;
    bumpStopDamping: number;
    reboundStopStiffness: number;
    reboundStopDamping: number;
  };
  drive: {
    maxMotorTorque: number;
    targetWheelOmega: number;
    brakeTorque: number;
    coastDragTorque: number;
  };
  balance: {
    groundLeanTorque: number;
    airLeanTorque: number;
    maxAngularSpeed: number;
    riderLeanVisualAngle: number;
  };
  crash: {
    outOfBoundsY: number;
    headCrashMinImpact: number;
    upsideDownAngleRad: number;
    upsideDownGraceSeconds: number;
  };
}

export const PHYSICS_CONFIG: PhysicsConfig = {
  world: {
    pixelsPerMeter: 44,
    gravityY: -15.6,
    fixedDt: 1 / 60,
    maxFrameDt: 0.05,
    velocityIterations: 10,
    positionIterations: 6,
  },
  chassis: {
    massKg: 24,
    inertia: 7.2,
    centerOfMassX: 0.06,
    centerOfMassY: 0.16,
    linearDamping: 0.024,
    angularDamping: 0.36,
    friction: 0.3,
    restitution: 0.04,
  },
  wheels: {
    radius: 0.37,
    rearOffsetX: -0.74,
    rearOffsetY: -0.34,
    frontOffsetX: 0.78,
    frontOffsetY: -0.32,
    density: 11.0,
    friction: 2.95,
    restitution: 0.02,
    angularDamping: 0.09,
  },
  suspension: {
    rearFrequencyHz: 5.9,
    rearDampingRatio: 0.85,
    frontFrequencyHz: 6.3,
    frontDampingRatio: 0.83,
    axisX: 0,
    axisY: 1,
    maxCompression: 0.19,
    maxExtension: 0.14,
    bumpStopStiffness: 8400,
    bumpStopDamping: 310,
    reboundStopStiffness: 3500,
    reboundStopDamping: 155,
  },
  drive: {
    maxMotorTorque: 138,
    targetWheelOmega: 47,
    brakeTorque: 178,
    coastDragTorque: 1.7,
  },
  balance: {
    groundLeanTorque: 165,
    airLeanTorque: 112,
    maxAngularSpeed: 5.5,
    riderLeanVisualAngle: 0.3,
  },
  crash: {
    outOfBoundsY: -14,
    headCrashMinImpact: 1.2,
    upsideDownAngleRad: 2.1,
    upsideDownGraceSeconds: 1.0,
  },
};
