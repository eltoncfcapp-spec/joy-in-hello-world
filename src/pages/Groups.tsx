// Groups.tsx
const Groups = () => {
  console.log('GROUPS COMPONENT IS RENDERING!');
  
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue' }}>
      <h1>HELLO WORLD - GROUPS PAGE IS WORKING! 🎉</h1>
      <p>If you can see this, the routing is fixed!</p>
      <button onClick={() => alert('Button works!')}>
        Test Interactive Button
      </button>
    </div>
  );
};

export default Groups;
