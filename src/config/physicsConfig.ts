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
    gravityY: -16.5,
    fixedDt: 1 / 60,
    maxFrameDt: 0.05,
    velocityIterations: 10,
    positionIterations: 6,
  },
  chassis: {
    massKg: 42,
    centerOfMassX: -0.04,
    centerOfMassY: 0.22,
    linearDamping: 0.04,
    angularDamping: 0.3,
    friction: 0.35,
    restitution: 0.04,
  },
  wheels: {
    radius: 0.37,
    rearOffsetX: -0.74,
    rearOffsetY: -0.26,
    frontOffsetX: 0.78,
    frontOffsetY: -0.24,
    density: 1.6,
    friction: 2.8,
    restitution: 0.03,
    angularDamping: 0.14,
  },
  suspension: {
    rearFrequencyHz: 5.6,
    rearDampingRatio: 0.78,
    frontFrequencyHz: 6.0,
    frontDampingRatio: 0.76,
    axisX: 0,
    axisY: 1,
  },
  drive: {
    maxMotorTorque: 145,
    targetWheelOmega: 42,
    brakeTorque: 185,
    coastDragTorque: 4.0,
  },
  balance: {
    groundLeanTorque: 235,
    airLeanTorque: 115,
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
