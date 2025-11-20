// lib/swal.js
import Swal from 'sweetalert2';

export function swalLoading(title = 'Cargando...', text = 'Por favor espere') {
  return Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

export function swalSuccess(title = 'Operación exitosa', text = '') {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    timer: 1800,
    showConfirmButton: false,
  });
}

export function swalError(title = 'Ocurrió un error', text = 'Intente de nuevo') {
  return Swal.fire({
    icon: 'error',
    title,
    text,
  });
}

export function swalClose() {
  Swal.close();
}
