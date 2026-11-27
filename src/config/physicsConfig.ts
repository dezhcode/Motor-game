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
    gravityY: -13.5,
    fixedDt: 1 / 60,
    maxFrameDt: 0.05,
    velocityIterations: 10,
    positionIterations: 6,
  },
  chassis: {
    massKg: 24,
    inertia: 7.5,
    centerOfMassX: 0.05,
    centerOfMassY: 0.18,
    linearDamping: 0.03,
    angularDamping: 0.32,
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
    friction: 2.8,
    restitution: 0.02,
    angularDamping: 0.1,
  },
  suspension: {
    rearFrequencyHz: 5.4,
    rearDampingRatio: 0.82,
    frontFrequencyHz: 5.8,
    frontDampingRatio: 0.8,
    axisX: 0,
    axisY: 1,
    maxCompression: 0.19,
    maxExtension: 0.14,
    bumpStopStiffness: 7500,
    bumpStopDamping: 280,
    reboundStopStiffness: 3200,
    reboundStopDamping: 140,
  },
  drive: {
    maxMotorTorque: 108,
    targetWheelOmega: 33,
    brakeTorque: 150,
    coastDragTorque: 1.8,
  },
  balance: {
    groundLeanTorque: 145,
    airLeanTorque: 88,
    maxAngularSpeed: 4.8,
    riderLeanVisualAngle: 0.28,
  },
  crash: {
    outOfBoundsY: -14,
    headCrashMinImpact: 1.2,
    upsideDownAngleRad: 2.1,
    upsideDownGraceSeconds: 1.0,
  },
};
