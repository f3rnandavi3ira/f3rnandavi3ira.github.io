
// Configuração específica para a página de doação
const DONATION_CONFIG = {
  SHEET_ID: '1uYatfdAcGMl3h-3yN5d3HLuBycsAanykFVTs--lVf24',
  SHEET_NAME: 'D4', // Nome da aba da planilha
  BACKUP_DATA: {
    arrecadado: 7734.45,
    necessario: 46181.25
  }
};

// Função específica para formatar valores
const formatDonationValue = (value) => {
  return 'R$ ' + value.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+,)/g, '$1.');
};

// Função para buscar dados da planilha (versão simplificada)
const fetchDonationData = async () => {
  try {
    const response = await fetch(
      `https://docs.google.com/spreadsheets/d/${DONATION_CONFIG.SHEET_ID}/gviz/tq?` +
      `tqx=out:csv&sheet=${DONATION_CONFIG.SHEET_NAME}`
    );
    
    if (!response.ok) throw new Error('Erro na rede');
    
    const csvData = await response.text();
    const rows = csvData.split('\n').filter(row => row.trim() !== '');
    
    if (rows.length < 2) throw new Error('Dados insuficientes');
    
    const lastRow = rows[rows.length - 1];
    // Extrai valores considerando formato CSV com possíveis aspas
    const values = lastRow.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
    
    return {
      arrecadado: parseFloat(values[1].replace(/[^\d,]/g, '').replace(',', '.')) || 0,
      necessario: parseFloat(values[2].replace(/[^\d,]/g, '').replace(',', '.')) || 0
    };
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    return DONATION_CONFIG.BACKUP_DATA;
  }
};

// Atualiza apenas a barra de progresso
const updateDonationProgress = async () => {
  const { arrecadado, necessario } = await fetchDonationData();
  const porcentagem = Math.min(100, (arrecadado / necessario) * 100);
  
  // Atualiza a barra
  const progressBar = document.getElementById('donation-progress-bar');
  if (progressBar) {
    progressBar.style.width = `${porcentagem}%`;
    progressBar.textContent = `${porcentagem.toFixed(1)}%`;
  }
  
  // Atualiza os textos
  const elements = {
    collected: document.getElementById('donation-collected'),
    total: document.getElementById('donation-total'),
    remaining: document.getElementById('donation-remaining')
  };
  
  if (elements.collected) elements.collected.textContent = formatDonationValue(arrecadado);
  if (elements.total) elements.total.textContent = formatDonationValue(necessario);
  if (elements.remaining) elements.remaining.textContent = formatDonationValue(necessario - arrecadado);
};

// Inicializa apenas os elementos desta página
document.addEventListener('DOMContentLoaded', () => {
  // Verifica se estamos na página de doação
  if (document.getElementById('donation-progress-bar')) {
    updateDonationProgress();
    setInterval(updateDonationProgress, 5 * 60 * 1000); // Atualiza a cada 5 minutos
  }
});

// Funções de copiar mantidas específicas para esta página
function copyPixKey() {
    const pixKey = "11942157562"; // Corrigi para a chave que aparece no seu HTML
    const messageElement = document.getElementById('pixCopyMessage');
    
    navigator.clipboard.writeText(pixKey).then(() => {
        // Mostra a mensagem de sucesso
        messageElement.textContent = "Chave PIX copiada com sucesso!";
        messageElement.style.display = "block";
        messageElement.style.color = "green";
        messageElement.className = "mt-2 text-success"; // Classes do Bootstrap para cor verde
        
        // Esconde a mensagem após 3 segundos
        setTimeout(() => {
            messageElement.style.display = "none";
        }, 3000);
    }).catch(err => {
        // Mostra mensagem de erro se houver problema
        messageElement.textContent = "Erro ao copiar a chave PIX";
        messageElement.style.display = "block";
        messageElement.style.color = "red";
        messageElement.className = "mt-2 text-danger"; // Classes do Bootstrap para cor vermelha
        
        setTimeout(() => {
            messageElement.style.display = "none";
        }, 3000);
    });
}


// Adicione esta função para redimensionar o gráfico quando a janela for redimensionada
function resizeChart() {
  const chartDiv = document.getElementById('grafico-arrecadacao');
  if (!chartDiv) return;

  const width = chartDiv.offsetWidth;
  
  // Define altura baseada no tamanho da tela
  const height = window.innerWidth >= 768 ? 400 : 300;
  
  if (typeof google !== 'undefined' && google.visualization) {
    const chart = google.visualization.arrayToDataTable([
      ['Item', 'Valor'],
      ['Arrecadado', arrecadado],
      ['Faltante', necessario - arrecadado]
    ]);
    
    const options = {
      width: width,
      height: height,
      pieHole: 0.4,
      pieSliceText: 'value',
      legend: {
        position: window.innerWidth >= 768 ? 'labeled' : 'none'
      },
      chartArea: {
        width: '90%', 
        height: '90%',
        top: 20,
        left: 20
      },
      fontSize: window.innerWidth >= 768 ? 14 : 12,
      tooltip: {text: 'value'}
    };
    
    const chartObj = new google.visualization.PieChart(chartDiv);
    chartObj.draw(chart, options);
  }
}

// Inicializa e redimensiona quando a janela muda de tamanho
document.addEventListener('DOMContentLoaded', resizeChart);
window.addEventListener('resize', resizeChart);