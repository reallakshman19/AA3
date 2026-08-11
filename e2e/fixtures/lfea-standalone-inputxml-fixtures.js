export function lfeaStandaloneInputXmlX() {
  return fixture({ jobName: 'LFEA-STANDALONE-E2E-X', deltaX: 1000, deltaY: 0 });
}

export function lfeaStandaloneInputXmlY() {
  return fixture({ jobName: 'LFEA-STANDALONE-E2E-Y', deltaX: 0, deltaY: 1000 });
}

export function lfeaStandaloneMalformedInputXml() {
  return '<CAESARII xmlns="COADE"><PIPINGMODEL><PIPINGELEMENT FROM_NODE="10"';
}

function fixture({ jobName, deltaX, deltaY }) {
  return `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">
    <UNITS>
      <LENGTH LABEL="MM" FACTOR="25.4"/>
      <FORCE LABEL="N" FACTOR="4.4482216152605"/>
      <MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/>
      <STRESS LABEL="MPA" FACTOR="0.006894757293168"/>
      <PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/>
      <EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
      <TEMP LABEL="C" FACTOR="0.5555555555555556"/>
      <PDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
      <IDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
      <FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
    </UNITS>
    <PIPINGMODEL xmlns="" JOBNAME="${jobName}">
      <PIPINGELEMENT FROM_NODE="10" TO_NODE="20"
        DELTA_X="${deltaX}" DELTA_Y="${deltaY}" DELTA_Z="0"
        DIAMETER="114.3" WALL_THICK="6.02"
        MATERIAL_NAME="A106 Grade B" MATERIAL_NUM="106"
        MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850"
        TEMP_EXP_C1="100">
        <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
      </PIPINGELEMENT>
    </PIPINGMODEL>
  </CAESARII>`;
}
