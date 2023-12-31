import React, { ChangeEvent } from "react";
import { Benchmark } from "../Benchmark";
import { BenchmarkedResultSlot, WindowWithTauri } from "../../../tauri";
import { FixedArray } from "../../../util";
import { DEFAULT_BASE_URL, thermalExpansionForHoneycomb } from "../../../remote-compute";
import init, { download_results_for_thermal_expansion_for_honeycomb } from "../../../xlsx-writer/pkg/xlsx_writer";

export const ThermalExpansionForHoneycomb: React.FC = () => {
    const numberOfModel = 1;
    // Internally, the only available model ignores the wall thickness,
    // so it's not one of the inputs.
    const wallThickness = -1.0;
    const [lCellSideSize, setLCellSideSize] = React.useState(9.24);
    const [hCellSideSize, setHCellSideSize] = React.useState(8.4619);
    const [angle, setAngle] = React.useState(Math.PI / 6);
    const [alphaForHoneycomb, setAlphaForHoneycomb] = React.useState(0.2);
    const [computedValues, setComputedValues] = React.useState<BenchmarkedResultSlot<FixedArray<number, 3>>>(([[],{secs: 0, nanos: 0}]));

    function handleLCellSideSizeChange(event: ChangeEvent<HTMLInputElement>) {
        setLCellSideSize(parseFloat(event.target.value));
    }

    function handleHCellSideSizeChange(event: ChangeEvent<HTMLInputElement>) {
        setHCellSideSize(parseFloat(event.target.value));
    }
    function handleAngleChange(event: ChangeEvent<HTMLInputElement>) {
        setAngle(parseFloat(event.target.value));
    }
    
    function handleAlphaForHoneycombChange(event: ChangeEvent<HTMLInputElement>) {
        setAlphaForHoneycomb(parseFloat(event.target.value));
    }

    async function try_compute_remotely(): Promise<boolean> {
        const baseUrl = DEFAULT_BASE_URL;
        return thermalExpansionForHoneycomb(
            baseUrl,
            numberOfModel,
            lCellSideSize,
            hCellSideSize,
            wallThickness,
            angle,
            alphaForHoneycomb
        ).then((response) => {
            console.log(response);
            setComputedValues([response, {secs: 0, nanos: 0}]);
            return true;
        }).catch((error) => {
            console.error(error);
            return false;
        })
    }

    async function try_compute_with_tauri(): Promise<boolean> {
        if (!("__TAURI__" in window)) {
            return false
        }

        const tauriWindow = window as WindowWithTauri;

        const response = await tauriWindow.__TAURI__.invoke("thermal_expansion_for_honeycomb", {
            numberOfModel: numberOfModel,
            lCellSideSize: lCellSideSize,
            hCellSideSize: hCellSideSize,
            wallThickness: wallThickness,
            angle: angle,
            alphaForHoneycomb: alphaForHoneycomb,
        });
        console.log(response);
        setComputedValues(response);
        return true;
    }

    async function compute() {
        if (!(await try_compute_with_tauri() || await try_compute_remotely())) {
            console.error("Failed to compute because Tauri API is not available in browser and remote computation failed");
            return;
        }
    }

    function exportToExcel() {
        const array = new Float64Array(9);
        array[0] = computedValues[0][0] as number;
        array[1] = computedValues[0][1] as number;
        array[2] = computedValues[0][2] as number;
        init().then(() => {
            download_results_for_thermal_expansion_for_honeycomb(array);
        });
    }

    return <>
        <form>
            <label>Размер ячейки в длину:
                <input type="number" value={lCellSideSize} step="0.1" onChange={handleLCellSideSizeChange} />
            </label>
            <br />
            <label>Размер ячейки в высоту:
                <input type="number" value={hCellSideSize} step="0.1" onChange={handleHCellSideSizeChange} />
            </label>
            <br />
            <label>Угол между горизонталью и наклонной стенкой ячейки соты (в радианах):
                <input type="number" value={angle} step="0.1" onChange={handleAngleChange} />
            </label>
            <br />
            <label>Коэффициент теплового расширения (α) для материала соты:
                <input type="number" value={alphaForHoneycomb} step="0.1" onChange={handleAlphaForHoneycombChange} />
            </label>
            <br />
            <input type="button" value="Рассчитать" onClick={compute} />

            { computedValues[0].length == 3 &&
                <>
                    <input type="button" value="Эксортировать как .xlsx" onClick={exportToExcel} />

                    <h2>Значения:</h2>
                    <p>α1 = {computedValues[0][0].toFixed(10)}</p>
                    <p>α2 = {computedValues[0][1].toFixed(10)}</p>
                    <p>α3 = {computedValues[0][2].toFixed(10)}</p>
                    <Benchmark t={computedValues[1]} />
                </>
            }

        </form>
    </>
}
