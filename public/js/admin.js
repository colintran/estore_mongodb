const deleteProduct = (btn) => {
    const csrf = btn.parentNode.querySelector("[name=_csrf]").value;
    const productId = btn.parentNode.querySelector("[name=productId]").value;
    productElement = btn.closest('article');
    fetch(`/admin/products/${productId}`,{
            method: 'DELETE',
            headers: {
                'csrf-token': csrf
            }
        }
    )
    .then(result => {
        return result.json();
    })
    .then(data => {
        console.log('data: %o',data);
        productElement.parentNode.removeChild(productElement);
    })
    .catch(err => {
        console.log('error: %o',err);
    })
}