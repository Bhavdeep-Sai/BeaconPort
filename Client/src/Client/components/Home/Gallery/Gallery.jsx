import { useState, useEffect } from 'react';
import axios from 'axios';
import { baseApi } from '../../../../environment';

export default function Gallery() {
  const [schools, setSchools] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get(`${baseApi}/school/all`)
      .then(res => setSchools(res.data.schools))
      .catch(console.error);
  }, []);

  return (
    <div className="py-10 px-4">
      <h2 className="text-3xl font-bold text-center text-white mb-8">Registered Schools</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {schools.map((school) => (
          <div key={school._id} onClick={() => setSelected(school)}
            className="cursor-pointer rounded-xl overflow-hidden border border-gray-700 bg-gray-800 hover:border-orange-500/50 transition-all group">
            <img src={`./images/uploaded/school/${school.schoolImg}`} alt={school.schoolName}
              loading="lazy" className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-gray-200 truncate">{school.schoolName}</p>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 rounded-2xl overflow-hidden max-w-lg w-full border border-gray-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-center font-bold text-xl text-orange-400 py-3 border-b border-gray-700">{selected.schoolName}</h3>
            <img src={`./images/uploaded/school/${selected.schoolImg}`} alt={selected.schoolName} className="w-full max-h-[70vh] object-contain" />
            <div className="p-3 text-center">
              <button onClick={() => setSelected(null)} className="text-sm text-gray-400 hover:text-white transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
