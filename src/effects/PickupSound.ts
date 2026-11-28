export interface PickupNote { frequency: number; endFrequency: number; offset: number; duration: number; gain: number; type: OscillatorType }

/** Short bright metallic coin ping; lower bubbling/rising fuel refill cue. */
export function pickupNotes(kind: 'coin' | 'fuel', sequence = 0): PickupNote[] {
  if (kind === 'fuel') return [
    {frequency:220,endFrequency:440,offset:0,duration:.13,gain:.075,type:'sine'},
    {frequency:330,endFrequency:660,offset:.07,duration:.14,gain:.065,type:'sine'},
    {frequency:660,endFrequency:880,offset:.16,duration:.19,gain:.06,type:'triangle'},
  ];
  const pitch = 1046.5 * Math.pow(2, Math.max(0, Math.min(5, sequence)) / 12);
  return [
    {frequency:pitch,endFrequency:pitch*1.02,offset:0,duration:.16,gain:.085,type:'sine'},
    {frequency:pitch*2.4,endFrequency:pitch*2.3,offset:0,duration:.09,gain:.025,type:'sine'},
    {frequency:pitch*1.5,endFrequency:pitch*1.5,offset:.045,duration:.17,gain:.04,type:'triangle'},
  ];
}
