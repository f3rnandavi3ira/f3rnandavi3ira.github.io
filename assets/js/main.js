
  // Configuração global
  const CONFIG = {
    // Para a API do BCB (Banco Central do Brasil)
    CODIGO_EUR_BRL: 21619, // Código para EUR/BRL no BCB
    SHEET_ID: '1uYatfdAcGMl3h-3yN5d3HLuBycsAanykFVTs--lVf24',
    BACKUP_DATA: {
      arrecadado: 7734.45,
      necessario: 46181.25,
      cambio: 5.50 // Valor de fallback caso a API falhe
    }
  };

  // Formatação monetária
  const formatCurrency = (value, currency = 'R$') => {
    if (isNaN(value)) return `${currency} --,--`;
    return `${currency} ${value.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+,)/g, '$1.')}`;
  };

  // Formatação para euros
  const formatEuro = (value) => {
    if (isNaN(value)) return '€--,--';
    return `€${value.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+,)/g, '$1.')}`;
  };

  // Busca a taxa de câmbio atual
  const fetchTaxaCambio = async () => {
    const loadingElement = document.getElementById('cambio-loading');
    const cambioElement = document.getElementById('taxa-cambio');
    const euroElement = document.getElementById('valor-euro');
    const atualizacaoElement = document.getElementById('atualizacao-cambio');
    
    loadingElement.style.display = 'inline-block';
    
    try {
      // API do Banco Central do Brasil (EUR-BRL)
      const response = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${CONFIG.CODIGO_EUR_BRL}/dados/ultimos/1?formato=json`);
      
      if (!response.ok) throw new Error('Erro na API');
      
      const data = await response.json();
      
      if (!data || !data.length) throw new Error('Dados inválidos');
      
      const taxa = parseFloat(data[0].valor);
      
      if (isNaN(taxa)) throw new Error('Taxa inválida');
      
      // Atualiza a interface
      cambioElement.textContent = taxa.toFixed(2).replace('.', ',');
      atualizacaoElement.textContent = `Atualizado em: ${new Date().toLocaleTimeString()}`;
      
      return taxa;
    } catch (error) {
      console.error('Erro ao buscar taxa de câmbio:', error);
      cambioElement.textContent = CONFIG.BACKUP_DATA.cambio.toFixed(2).replace('.', ',');
      atualizacaoElement.textContent = 'Taxa padrão (API indisponível)';
      return CONFIG.BACKUP_DATA.cambio;
    } finally {
      loadingElement.style.display = 'none';
    }
  };


  // Desenha o gráfico
  const drawChart = async () => {
    // Busca a taxa de câmbio primeiro
    const taxaCambio = await fetchTaxaCambio();
    
    // URL alternativa caso a planilha não esteja acessível
    try {
      const sheetURL = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=D4`;
      
      const response = await fetch(sheetURL);
      if (!response.ok) throw new Error('Erro na rede');
      
      const csvText = await response.text();
      
      // Processamento seguro dos dados
      let arrecadado, necessario;
      
      try {
        const rows = csvText.split('\n').filter(row => row.trim() !== '');
        if (rows.length < 2) throw new Error('Dados insuficientes');
        
        const lastRow = rows[rows.length - 1].split(/(?!\B"[^"]*),(?![^"]*"\B)/);
        
        // Extração robusta dos valores
        const extrairValor = (str) => {
          const num = parseFloat(str.replace(/[^\d,-]/g, '').replace(',', '.'));
          return isNaN(num) ? 0 : Math.abs(num);
        };
        
        arrecadado = extrairValor(lastRow[1]);
        necessario = extrairValor(lastRow[2]);
        
        // Validação dos valores
        if (arrecadado === 0 && necessario === 0) {
          throw new Error('Valores zerados');
        }
      } catch (e) {
        console.warn('Usando dados de backup:', e.message);
        arrecadado = CONFIG.BACKUP_DATA.arrecadado;
        necessario = CONFIG.BACKUP_DATA.necessario;
      }
      
      // Garante que o valor faltante nunca seja negativo
      const faltante = Math.max(0, necessario - arrecadado);
      
      // Criação do gráfico
      const data = google.visualization.arrayToDataTable([
        ['Status', 'Valor', {role: 'tooltip', type: 'string'}],
        ['Arrecadado', arrecadado, 
          `${formatCurrency(arrecadado)}\n(${(arrecadado/necessario*100).toFixed(1)}% da meta)`],
        ['Faltante', faltante, 
          `${formatCurrency(faltante)}\n(${(faltante/necessario*100).toFixed(1)}% da meta)`]
      ]);
      
      const options = {
        title: `Progresso da Arrecadação - Meta: ${formatCurrency(necessario)}`,
        pieHole: 0.4,
        colors: ['#198754', '#8d99ae'],
        legend: {
          position: 'right',
          alignment: 'center'
        },
        pieSliceText: 'percentage',
        pieSliceTextStyle: {
          color: 'white',
          fontSize: 14,
          bold: true
        },
        tooltip: {
          isHtml: true,
          showColorCode: true
        },
        chartArea: {
          left: 20,
          top: 50,
          width: '90%',
          height: '80%'
        },
        backgroundColor: 'transparent',
        fontSize: 14
      };
      
      const chart = new google.visualization.PieChart(
        document.getElementById('grafico-arrecadacao')
      );
      chart.draw(data, options);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      usarDadosLocais(taxaCambio);
    }
  };
  
  const usarDadosLocais = (taxaCambio) => {
    const data = google.visualization.arrayToDataTable([
      ['Status', 'Valor'],
      ['Arrecadado', CONFIG.BACKUP_DATA.arrecadado],
      ['Faltante', CONFIG.BACKUP_DATA.necessario - CONFIG.BACKUP_DATA.arrecadado]
    ]);
    
    const chart = new google.visualization.PieChart(
      document.getElementById('grafico-arrecadacao')
    );
    chart.draw(data, {
      title: `Progresso da Arrecadação (Dados Locais) - Meta: ${formatCurrency(CONFIG.BACKUP_DATA.necessario)}`,
      pieHole: 0.4,
      colors: ['#4CAF50', '#F44336']
    });
  };

  // Inicialização
  google.charts.load('current', {'packages':['corechart']});
  google.charts.setOnLoadCallback(drawChart);

  // Atualiza a cada 30 minutos (opcional)
  setInterval(() => {
    fetchTaxaCambio().then(taxa => {
      const necessario = parseFloat(document.getElementById('grafico-arrecadacao')
        .getAttribute('data-meta-total').replace('R$', '').replace('.', '').replace(',', '.'));
      if (!isNaN(necessario)) {
        atualizarValorEuro(necessario, taxa);
      }
    });
  }, 30 * 60 * 1000); // 30 minutos

  