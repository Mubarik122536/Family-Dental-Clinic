import Swal from 'sweetalert2';

export const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    },
});

export const showSuccess = (title = 'Saved successfully!') => {
    Toast.fire({ icon: 'success', title });
};

export const showError = (title = 'Something went wrong') => {
    Toast.fire({ icon: 'error', title });
};

export const showConfirm = async (title = 'Are you sure?', text = '') => {
    const result = await Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#1a2b5f',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Yes, proceed',
        cancelButtonText: 'Cancel',
    });
    return result.isConfirmed;
};
