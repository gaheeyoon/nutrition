import React, { useState, useEffect, useRef } from 'react';
import { calculateNutrient, DAILY_VALUES } from './utils/nutritionLogic';
import { Download, Printer, Save, RefreshCcw, FileText, Info } from 'lucide-react';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

const INITIAL_STATE = {
  productName: '',
  totalWeight: 100,
  referenceWeight: 100,
  unit: 'g',
  data: {
    calories: { value: '', mode: '5kcal_unit' },
    carbs: { value: '', mode: 'unit_1' },
    sugars: { value: '', mode: 'unit_1' },
    protein: { value: '', mode: 'unit_1' },
    fat: { value: '', mode: 'unit_auto' },
    saturatedFat: { value: '', mode: 'unit_auto' },
    transFat: { value: '', mode: 'zero_under_02' },
    cholesterol: { value: '', mode: 'unit_5' },
    sodium: { value: '', mode: 'unit_5_10' },
  }
};

function App() {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem('nutrition_data');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const labelRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('nutrition_data', JSON.stringify(state));
  }, [state]);

  const handleInputChange = (field, value) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const handleNutrientChange = (nut, field, value) => {
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [nut]: { ...prev.data[nut], [field]: value }
      }
    }));
  };

  const resetData = () => {
    if (confirm('모든 데이터를 초기화하겠습니까?')) {
      setState(INITIAL_STATE);
    }
  };

  const downloadImage = async () => {
    if (!labelRef.current) return;
    try {
      const dataUrl = await toPng(labelRef.current, { backgroundColor: '#fff', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${state.productName || 'nutrition-label'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Image export failed', err);
    }
  };

  const downloadPdf = async () => {
    if (!labelRef.current) return;
    try {
      const dataUrl = await toJpeg(labelRef.current, { backgroundColor: '#fff', quality: 1 });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth / 2, pdfHeight / 2); // Small scale for label
      pdf.save(`${state.productName || 'nutrition-label'}.pdf`);
    } catch (err) {
      console.error('PDF export failed', err);
    }
  };

  const results = Object.keys(state.data).reduce((acc, nut) => {
    acc[nut] = calculateNutrient(
      nut, 
      parseFloat(state.data[nut].value) || 0, 
      state.totalWeight, 
      { 
        displayMode: state.data[nut].mode,
        referenceWeight: state.referenceWeight 
      }
    );
    return acc;
  }, {});

  const isOptionDisabled = (nut, value, optionValue) => {
    if (!value && value !== 0) return false;
    const baseValue = (parseFloat(value) * state.totalWeight) / state.referenceWeight;

    switch (optionValue) {
      case '5kcal_zero': return baseValue >= 5;
      case 'less_than_1': return baseValue >= 1;
      case 'zero_under_05': return baseValue >= 0.5;
      case 'less_than_05': return baseValue >= 0.5;
      case 'zero_under_02': return baseValue >= 0.2;
      case 'less_than_5': return baseValue >= 5;
      case 'zero_under_2': return baseValue >= 2;
      case 'zero_under_5': return baseValue >= 5;
      case 'unit_1': return baseValue < 1 && nut !== 'calories'; // Generally meaningful if >= 1
      default: return false;
    }
  };

  return (
    <div className="app-container">
      {/* Left Panel: Inputs */}
      <div className="input-panel">
        <div className="panel-header">
          <h1>가히의 영양정보표 생성기</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>자영업자 및 식품 판매자를 위한 미니멀 툴</p>
        </div>

        <div className="section-title"><FileText size={18} /> 기본 정보</div>
        <div className="input-group">
          <div className="field">
            <label>제품명</label>
            <input 
              type="text" 
              placeholder="예: 찹쌀김부각" 
              value={state.productName}
              onChange={e => handleInputChange('productName', e.target.value)}
            />
          </div>
          <div className="field">
            <label>총 내용량 ({state.unit})</label>
            <input 
              type="number" 
              value={state.totalWeight}
              onChange={e => handleInputChange('totalWeight', parseFloat(e.target.value) || 0)}
              placeholder="100"
            />
          </div>
          <div className="field">
            <label>영양성분 기준 함량 (g)</label>
            <input 
              type="number" 
              value={state.referenceWeight}
              onChange={e => handleInputChange('referenceWeight', parseFloat(e.target.value) || 0)}
              placeholder="100"
            />
          </div>
        </div>

        <div className="section-title"><RefreshCcw size={18} /> 영양 성분 ({state.referenceWeight}g 당 실험값 입력)</div>
        <div className="input-group">
          {Object.keys(state.data).map(nut => (
            <div className="field" key={nut}>
              <label>
                {getNutrientLabel(nut)}
                <Tooltip text={getNutrientTooltip(nut)} />
              </label>
              <input 
                type="number" 
                placeholder="0" 
                value={state.data[nut].value}
                onChange={e => handleNutrientChange(nut, 'value', e.target.value)}
              />
              <select 
                value={state.data[nut].mode}
                onChange={e => handleNutrientChange(nut, 'mode', e.target.value)}
              >
                {getOptionsForNutrient(nut).map(opt => (
                  <option 
                    key={opt.value} 
                    value={opt.value} 
                    disabled={isOptionDisabled(nut, state.data[nut].value, opt.value)}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <button className="btn btn-secondary" onClick={resetData} style={{ marginTop: '1rem' }}>
          초기화
        </button>
      </div>

      {/* Right Panel: Preview */}
      <div className="preview-panel">
        <div className="label-container" ref={labelRef}>
          <div className="nutrition-label">
            <div className="label-title">영양정보</div>
            <div className="label-subtitle">
              <span>총 내용량 {state.totalWeight}{state.unit}</span>
              <span>{results.calories.displayValue}</span>
            </div>
            
            <div className="daily-value-text">1일 영양성분 기준치에 대한 비율</div>

            <NutrientRow label="나트륨" value={results.sodium.displayValue} percentage={results.sodium.percentage} />
            <NutrientRow label="탄수화물" value={results.carbs.displayValue} percentage={results.carbs.percentage} />
            <NutrientRow label="당류" value={results.sugars.displayValue} percentage={results.sugars.percentage} sub />
            <NutrientRow label="지방" value={results.fat.displayValue} percentage={results.fat.percentage} />
            <NutrientRow label="트랜스지방" value={results.transFat.displayValue} percentage="" sub isNormal />
            <NutrientRow label="포화지방" value={results.saturatedFat.displayValue} percentage={results.saturatedFat.percentage} sub />
            <NutrientRow label="콜레스테롤" value={results.cholesterol.displayValue} percentage={results.cholesterol.percentage} />
            <NutrientRow label="단백질" value={results.protein.displayValue} percentage={results.protein.percentage} />

            <div className="label-footer">
              1일 영양성분 기준치에 대한 비율(%)은 2,000kcal 기준이므로 개인의 필요 열량에 따라 다를 수 있습니다.
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button className="btn btn-primary" onClick={downloadImage}>
            <Download size={18} /> 이미지 저장
          </button>
          <button className="btn btn-secondary" onClick={downloadPdf}>
            <Printer size={18} /> PDF 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

function Tooltip({ text }) {
  return (
    <div className="tooltip-container">
      <Info size={14} />
      <span className="tooltip-text">{text}</span>
    </div>
  );
}

function NutrientRow({ label, value, percentage, sub = false, isNormal = false }) {
  return (
    <div className={`nutrient-row ${sub ? 'sub' : ''}`}>
      <span className={isNormal ? 'normal' : ''}>{label} {value}</span>
      <span className="percentage">{percentage}</span>
    </div>
  );
}

function getNutrientLabel(nut) {
  const labels = {
    calories: '열량 (kcal)',
    carbs: '탄수화물 (g)',
    sugars: '당류 (g)',
    protein: '단백질 (g)',
    fat: '지방 (g)',
    saturatedFat: '포화지방 (g)',
    transFat: '트랜스지방 (g)',
    cholesterol: '콜레스테롤 (mg)',
    sodium: '나트륨 (mg)',
  };
  return labels[nut] || nut;
}

function getNutrientTooltip(nut) {
  switch (nut) {
    case 'calories': return "열량은 정수(1kcal 단위) 또는 5kcal 단위로 표시하며, 5kcal 미만인 경우 0kcal로 표시할 수 있습니다.";
    case 'carbs': return "탄수화물은 1g 단위로 표시하며, 1g 미만은 '1g 미만'으로, 0.5g 미만은 '0'으로 표시할 수 있습니다.";
    case 'sugars': return "당류는 1g 단위로 표시하며, 1g 미만은 '1g 미만'으로, 0.5g 미만은 '0'으로 표시할 수 있습니다.";
    case 'protein': return "단백질은 1g 단위로 표시하며, 1g 미만은 '1g 미만'으로, 0.5g 미만은 '0'으로 표시할 수 있습니다.";
    case 'fat': return "지방은 5g 초과 시 1g 단위로, 5g 이하 시 0.1g 단위로 표시하며, 0.5g 미만은 '0'으로 표시할 수 있습니다.";
    case 'saturatedFat': return "포화지방은 5g 초과 시 1g 단위로, 5g 이하 시 0.1g 단위로 표시하며, 0.5g 미만은 '0'으로 표시할 수 있습니다.";
    case 'transFat': return "트랜스지방은 0.5g 미만은 '0.5g 미만'으로, 0.2g 미만은 '0'으로 표시합니다. 식용유지는 100g당 2g 미만 시 '0' 표시가 가능합니다.";
    case 'cholesterol': return "콜레스테롤은 5mg 단위로 표시하며, 5mg 미만은 '5mg 미만'으로, 2mg 미만은 '0'으로 표시할 수 있습니다.";
    case 'sodium': return "나트륨은 120mg 이하 시 5mg 단위로, 120mg 초과 시 10mg 단위로 표시하며, 5mg 미만은 '0'으로 표시할 수 있습니다.";
    default: return "";
  }
}

function getOptionsForNutrient(nut) {
  switch (nut) {
    case 'calories':
      return [
        { label: '그대로 표시', value: 'raw' },
        { label: '5kcal 단위 표시', value: '5kcal_unit' },
        { label: '5kcal 미만 "0" 표시', value: '5kcal_zero' },
      ];
    case 'carbs':
    case 'sugars':
    case 'protein':
      return [
        { label: '그대로 표시', value: 'raw' },
        { label: '1g 단위 표시', value: 'unit_1' },
        { label: '1g 미만 표시', value: 'less_than_1' },
        { label: '0.5g 미만 "0" 표시', value: 'zero_under_05' },
      ];
    case 'fat':
    case 'saturatedFat':
      return [
        { label: '그대로 표시', value: 'raw' },
        { label: '표본 단위 (자동)', value: 'unit_auto' },
        { label: '0.5g 미만 "0" 표시', value: 'zero_under_05' },
      ];
    case 'transFat':
      return [
        { label: '그대로 표시', value: 'raw' },
        { label: '표본 단위 (자동)', value: 'unit_auto' },
        { label: '0.5g 미만 "0.5g 미만"', value: 'less_than_05' },
        { label: '0.2g 미만 "0" 표시', value: 'zero_under_02' },
        { label: '식용유지(100g당 2g미만) "0"', value: 'zero_under_02' }, // For simplicity, using same zero logic
      ];
    case 'cholesterol':
      return [
        { label: '그대로 표시', value: 'raw' },
        { label: '5mg 단위 표시', value: 'unit_5' },
        { label: '5mg 미만 표시', value: 'less_than_5' },
        { label: '2mg 미만 "0" 표시', value: 'zero_under_2' },
      ];
    case 'sodium':
      return [
        { label: '그대로 표시', value: 'raw' },
        { label: '5/10mg 단위 표시', value: 'unit_5_10' },
        { label: '5mg 미만 "0" 표시', value: 'zero_under_5' },
      ];
    default:
      return [{ label: '기본', value: 'raw' }];
  }
}

export default App;
